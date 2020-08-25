/* eslint-disable max-lines */

import {Injectable, NgZone} from '@angular/core';
import * as firebase from 'firebase/app';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'firebase/auth';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'firebase/database';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'firebase/messaging';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'firebase/storage';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {skip} from 'rxjs/operators';
import {env} from '../env';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {BinaryProto, IDatabaseItem, StringProto} from '../proto';
import {compareArrays} from '../util/compare';
import {
	getOrSetDefault,
	getOrSetDefaultObservable
} from '../util/get-or-set-default';
import {lock, lockFunction} from '../util/lock';
import {debugLog} from '../util/log';
import {request, requestByteStream} from '../util/request';
import {
	deserialize,
	dynamicDeserialize,
	dynamicSerialize,
	serialize
} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {
	promiseTimeout,
	resolvable,
	retryUntilSuccessful,
	sleep,
	waitForValue
} from '../util/wait';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {WorkerService} from './worker.service';

/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private readonly app: Promise<
		firebase.app.App & {
			auth: () => firebase.auth.Auth;
			database: (databaseURL?: string) => firebase.database.Database;
			messaging: () => firebase.messaging.Messaging;
			storage: (storageBucket?: string) => firebase.storage.Storage;
		}
	> = this.ngZone.runOutsideAngular(async () =>
		retryUntilSuccessful(() => {
			const app: any =
				firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);

			if (app.auth === undefined) {
				throw new Error('No Firebase Auth module.');
			}
			if (app.database === undefined) {
				throw new Error('No Firebase Database module.');
			}
			if (app.messaging === undefined) {
				throw new Error('No Firebase Messaging module.');
			}
			if (app.storage === undefined) {
				throw new Error('No Firebase Storage module.');
			}

			return app;
		})
	);

	/** @ignore */
	private readonly cordova = !this.envService.isCordovaMobile ?
		undefined :
		{
			messaging: (<any> self).PushNotification.init({
				android: {
					color: 'white',
					icon: 'notification_icon',
					iconColor: '#8b62d9'
				},
				ios: {
					alert: true,
					badge: true,
					sound: true
				}
			})
		};

	/** @ignore */
	private readonly localLocks = new Map<string, Record<string, unknown>>();

	/** Firebase Cloud Messaging token. */
	private readonly messaging: Promise<{
		token?: string;
	}> = this.ngZone
		.runOutsideAngular(async () => {
			const cordova = this.cordova;

			if (cordova) {
				return {
					token: await new Promise<string>(resolve => {
						cordova.messaging.on('registration', (o: any) => {
							resolve(o.registrationId);
						});
					})
				};
			}

			if (
				this.envService.isCordovaDesktop &&
				typeof cordovaRequire === 'function'
			) {
				const {ipcRenderer} = cordovaRequire('electron');
				const {
					NOTIFICATION_RECEIVED,
					NOTIFICATION_SERVICE_STARTED,
					START_NOTIFICATION_SERVICE
				} = cordovaRequire('electron-push-receiver/src/constants');

				ipcRenderer.on(
					NOTIFICATION_RECEIVED,
					(_: any, notification: any) => {
						if (
							typeof notification === 'object' &&
							typeof notification.body === 'string' &&
							notification.body
						) {
							this.notificationService.notify(notification.body);
						}
					}
				);

				const tokenPromise = new Promise<string>(resolve => {
					const f = (_: any, token: string) => {
						resolve(token);
						ipcRenderer.off(NOTIFICATION_SERVICE_STARTED, f);
					};
					ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, f);
				});

				ipcRenderer.send(
					START_NOTIFICATION_SERVICE,
					this.envService.firebaseConfig.messagingSenderId
				);

				return {token: await tokenPromise};
			}

			const app = await this.app;
			const messaging = app.messaging();
			const serviceWorkerRegistration = await this.workerService
				.serviceWorkerRegistration;

			await this.workerService.registerServiceWorkerFunction(
				'FCM',
				this.envService.firebaseConfig,
				/* eslint-disable-next-line no-shadow */
				config => {
					importScripts(
						'/assets/node_modules/firebase/firebase-app.js'
					);
					importScripts(
						'/assets/node_modules/firebase/firebase-messaging.js'
					);

					(<any> self).firebase.initializeApp(config);
					(<any> self).messaging = (<any> self).firebase.messaging();

					(<any> self).messaging.setBackgroundMessageHandler(
						(payload: any) => {
							const notification = !payload ?
								undefined :
							payload.notification?.title ?
								payload.notification :
								payload.data;

							if (!notification || !notification.title) {
								return;
							}

							notification.data = payload;

							return (<ServiceWorkerRegistration> (
								(<any> self).registration
							)).showNotification(
								notification.title,
								notification
							);
						}
					);
				}
			);

			messaging.useServiceWorker(serviceWorkerRegistration);
			await (<any> self).Notification.requestPermission();
			return {token: (await messaging.getToken()) || undefined};
		})
		.catch(() => ({}));

	/** Max number of bytes to upload to non-blob storage. */
	private readonly nonBlobStorageLimit = 8192;

	/** Max number of bytes to upload to non-blob storage in pushItem. */
	private readonly nonBlobStoragePushLimit = 4194304;

	/** @ignore */
	private readonly observableCaches = {
		watch: new Map<string, Observable<ITimedValue<any>>>(),
		watchExists: new Map<string, Observable<boolean>>(),
		watchList: new Map<string, Observable<ITimedValue<any>[]>>(),
		watchListKeyPushes: new Map<
			string,
			Observable<{key: string; previousKey?: string}>
		>(),
		watchListKeys: new Map<string, Observable<string[]>>(),
		watchListPushes: new Map<
			string,
			Observable<
				ITimedValue<any> & {
					key: string;
					previousKey?: string;
					url: string;
				}
			>
		>()
	};

	/** @ignore */
	private readonly pushItemLocks = new Map<string, LockFunction>();

	/** @ignore */
	private readonly pushItemTimeout = 10800000;

	/** @ignore */
	private async getDatabaseRef (
		url: string
	) : Promise<firebase.database.Reference> {
		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(this.processURL(url))
		);
	}

	/** @ignore */
	private async getListKeysInternal (
		value: Map<string, any> | Record<string, any>
	) : Promise<string[]> {
		if (!value) {
			return [];
		}

		const getValue =
			value instanceof Map ?
				(k: string) => value.get(k) :
				(k: string) => value[k];

		const getKeyTimestamp = (k: string) => getValue(k).timestamp;

		const now = await getTimestamp();

		let keys =
			value instanceof Map ?
				Array.from(value.keys()) :
				Object.keys(value);

		keys = keys.filter(
			k =>
				typeof getValue(k).hash === 'string' ||
				this.pushItemTimeout > now - getKeyTimestamp(k)
		);

		if (keys.length > 0 && typeof getKeyTimestamp(keys[0]) === 'number') {
			keys = keys.sort((a, b) =>
				getKeyTimestamp(a) > getKeyTimestamp(b) ? 1 : -1
			);
		}
		else {
			keys = keys.sort();
		}

		const endIndex = keys.findIndex(
			k => typeof getValue(k).hash !== 'string'
		);

		return endIndex >= 0 ? keys.slice(0, endIndex) : keys;
	}

	/** @ignore */
	private async getStorageDownloadURL (
		storageRef: firebase.storage.Reference
	) : Promise<string> {
		return this.localStorageService.getOrSetDefault(
			`FirebaseDatabaseService.getStorageDownloadURL:${storageRef.fullPath}`,
			StringProto,
			async () => promiseTimeout(storageRef.getDownloadURL(), 15000)
		);
	}

	/** @ignore */
	private async getStorageRef (
		url: string,
		hash: string
	) : Promise<firebase.storage.Reference> {
		const fullURL = `${url}/${hash}`;

		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(fullURL) ?
				(await this.app).storage().refFromURL(fullURL) :
				(await this.app).storage().ref(this.processURL(fullURL))
		);
	}

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@${this.namespace}`;
	}

	/** @ignore */
	private async waitForValue (
		url: string
	) : Promise<firebase.database.DataSnapshot> {
		return new Promise<firebase.database.DataSnapshot>(async resolve => {
			const ref = await this.getDatabaseRef(url);

			const onValue = (
				/* eslint-disable-next-line no-null/no-null */
				snapshot: firebase.database.DataSnapshot | null
			) => {
				if (
					snapshot?.exists() &&
					typeof snapshot.val().hash === 'string'
				) {
					ref.off('value', onValue);
					resolve(snapshot);
				}
			};

			ref.on('value', onValue);
		});
	}

	/** @inheritDoc */
	protected processURL (url: string) : string {
		return url.startsWith('.') ? url : super.processURL(url);
	}

	/** @inheritDoc */
	public async callFunction (
		name: string,
		data: Record<string, any> = {}
	) : Promise<any> {
		const o = {
			...data,
			namespace: this.namespace,
			testEnvName: this.envService.environment.useProdSigningKeys ?
				undefined :
				this.envService.environment.envName
		};

		debugLog(() => ({databaseCallFunction: [name, o]}));

		const {currentUser} = (await this.app).auth();

		try {
			const {err, result} = dynamicDeserialize(
				await request({
					contentType: 'text/plain',
					data: dynamicSerialize(o),
					headers: currentUser ?
						{
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							Authorization: await currentUser.getIdToken()
						} :
						undefined,
					method: 'POST',
					url: `https://us-central1-${this.envService.environment.firebase.project}.cloudfunctions.net/${name}`
				})
			);

			if (err !== undefined) {
				throw err;
			}

			return result;
		}
		catch (err) {
			throw new Error(
				`Function ${name} failed${
					typeof err === 'string' ? `: ${err}` : '.'
				}`
			);
		}
	}

	/** @inheritDoc */
	public async changePassword (
		username: string,
		oldPassword: string,
		newPassword: string
	) : Promise<void> {
		return this.ngZone.runOutsideAngular(async () => {
			await this.login(username, oldPassword);

			const auth = (await this.app).auth();

			if (
				!auth.currentUser ||
				!auth.currentUser.email ||
				auth.currentUser.email.split('@')[0].toLowerCase() !==
					username.toLowerCase()
			) {
				throw new Error('Failed to change password.');
			}

			await auth.currentUser.updatePassword(newPassword);
			await this.login(username, newPassword);
		});
	}

	/** @inheritDoc */
	public async checkDisconnected (
		urlPromise: MaybePromise<string>
	) : Promise<boolean> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			return (
				(await (await this.getDatabaseRef(url)).once('value')).val() !==
				undefined
			);
		});
	}

	/** @inheritDoc */
	public connectionStatus () : Observable<boolean> {
		return this.ngZone.runOutsideAngular(
			() =>
				new Observable<boolean>(observer => {
					let cleanup: () => void;

					(async () => {
						const connectedRef = await this.getDatabaseRef(
							'.info/connected'
						);

						const onValue = (
							/* eslint-disable-next-line no-null/no-null */
							snapshot: firebase.database.DataSnapshot | null
						) => {
							if (!snapshot) {
								return;
							}

							this.ngZone.run(() => {
								observer.next(snapshot.val() === true);
							});
						};

						connectedRef.on('value', onValue);
						cleanup = () => {
							connectedRef.off('value', onValue);
						};
					})();

					return async () => {
						(await waitForValue(() => cleanup))();
					};
				})
		);
	}

	/** @inheritDoc */
	public downloadItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		waitUntilExists: boolean = false,
		verifyHash?: string
	) : {
		alreadyCached: Promise<boolean>;
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress = new BehaviorSubject(0);
		const alreadyCached = resolvable<boolean>();

		const result = this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			const {data, hash, timestamp} = await this.getMetadata(
				url,
				waitUntilExists
			);

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			if (verifyHash !== undefined && verifyHash !== hash) {
				throw new Error(
					'FirebaseDatabaseService.downloadItem verifyHash mismatch: ' +
						`'${verifyHash}' !== '${hash}'`
				);
			}

			try {
				const localValueBytes = await (verifyHash === undefined ?
					this.cache.value.getItem({hash, url}, BinaryProto) :
					Promise.reject()
				).catch(async err => {
					if (data === undefined) {
						throw err;
					}
					return this.potassiumService.fromBase64(data);
				});

				const localValue = await deserialize(proto, localValueBytes);

				alreadyCached.resolve(true);
				this.ngZone.run(() => {
					progress.next(100);
					progress.complete();
				});

				this.cache.value.setItem(
					{hash, url},
					BinaryProto,
					localValueBytes
				);

				return {timestamp, value: localValue};
			}
			catch {}

			alreadyCached.resolve(false);
			this.ngZone.run(() => {
				progress.next(0);
			});

			const storageRef = await this.getStorageRef(url, hash);

			const req = requestByteStream({
				retries: 3,
				url: await this.getStorageDownloadURL(storageRef)
			});

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			req.progress.subscribe(
				n => {
					this.ngZone.run(() => {
						progress.next(n);
					});
				},
				err => {
					this.ngZone.run(() => {
						progress.next(err);
					});
				}
			);

			const value = await req.result;

			this.ngZone.run(() => {
				progress.next(100);
				progress.complete();
			});
			this.cache.value.setItem({hash, url}, BinaryProto, value);
			return {timestamp, value: await deserialize(proto, value)};
		});

		result.catch((err: any) => {
			alreadyCached.reject(err);
			progress.error(err);
		});

		alreadyCached.catch(() => {});

		return {
			alreadyCached,
			progress,
			result
		};
	}

	/** @inheritDoc */
	public async getLatestKey (
		urlPromise: MaybePromise<string>
	) : Promise<string | undefined> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			try {
				const value = (await (await this.getDatabaseRef(url)).once(
					'value'
				)).val();
				const keys = await this.getListKeysInternal(value);

				return keys
					.filter(k => !isNaN(value[k].timestamp))
					.sort((a, b) => value[b].timestamp - value[a].timestamp)[0];
			}
			catch {
				return undefined;
			}
		});
	}

	/** @inheritDoc */
	public async getList<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>
	) : Promise<T[]> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			try {
				return await Promise.all(
					(await this.getListKeys(url)).map(async k =>
						this.getItem(`${url}/${k}`, proto)
					)
				);
			}
			catch {
				return [];
			}
		});
	}

	/** @inheritDoc */
	public async getListKeys (
		urlPromise: MaybePromise<string>
	) : Promise<string[]> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			try {
				return await this.getListKeysInternal(
					(await (await this.getDatabaseRef(url)).once('value')).val()
				);
			}
			catch {
				return [];
			}
		});
	}

	/** @inheritDoc */
	public async getMetadata (
		urlPromise: MaybePromise<string>,
		waitUntilExists: boolean = false
	) : Promise<IDatabaseItem> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;
			const ref = await this.getDatabaseRef(url);

			let val: any;

			if (waitUntilExists) {
				val = await new Promise<any>(resolve => {
					const onValue = (
						/* eslint-disable-next-line no-null/no-null */
						snapshot: firebase.database.DataSnapshot | null
					) => {
						if (!snapshot?.exists()) {
							return;
						}

						ref.off('value', onValue);
						resolve(snapshot.val());
					};

					ref.on('value', onValue);
				});
			}
			else {
				val = (await ref.once('value')).val();
			}

			const {data, hash, timestamp} = val || {
				data: undefined,
				hash: undefined,
				timestamp: undefined
			};

			if (typeof hash !== 'string' || typeof timestamp !== 'number') {
				throw new Error(`Item at ${url} not found.`);
			}

			const metadata = {
				hash,
				timestamp,
				...(typeof data === 'string' ? {data} : {})
			};

			await this.cache.metadata.setItem(url, metadata);

			return metadata;
		});
	}

	/** @inheritDoc */
	public async hasItem (urlPromise: MaybePromise<string>) : Promise<boolean> {
		return this.ngZone
			.runOutsideAngular(async () => {
				const url = await urlPromise;

				const metadata = await this.getMetadata(url);

				if (metadata.data !== undefined) {
					return;
				}

				this.getStorageDownloadURL(
					await this.getStorageRef(url, metadata.hash)
				);
			})
			.then(() => true)
			.catch(() => false);
	}

	/** @inheritDoc */
	public async lock<T> (
		urlPromise: MaybePromise<string>,
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string,
		global: boolean = true
	) : Promise<T> {
		const url = await this.lockURL(urlPromise, global);

		return this.ngZone.runOutsideAngular(async () =>
			lock(
				getOrSetDefault<string, Record<string, unknown>>(
					this.localLocks,
					url,
					() => ({})
				),
				async () => {
					let lastReason: string | undefined;
					let onQueueUpdate: (() => Promise<void>) | undefined;

					const queue = await this.getDatabaseRef(url);
					const localLock = lockFunction();
					const id = uuid();
					let isActive = true;

					const lockData: {
						reason?: string;
						stillOwner: BehaviorSubject<boolean>;
					} = {
						stillOwner: new BehaviorSubject<boolean>(false)
					};

					const mutex = await queue.push().then();

					const getLockTimestamp = async () => {
						const o = (await mutex.once('value')).val() || {};

						if (
							typeof o.id !== 'string' ||
							!o.id ||
							typeof o.timestamp !== 'number' ||
							isNaN(o.timestamp)
						) {
							throw new Error(
								`Invalid server timestamp: {id: '${o.id}', timestamp: ${o.timestamp}}`
							);
						}

						return o.timestamp;
					};

					const contendForLock = async () =>
						retryUntilSuccessful(async () => {
							try {
								await mutex
									.set({
										timestamp:
											firebase.database.ServerValue
												.TIMESTAMP
									})
									.then();

								/*
								Conflicts with workaround in constructor:

								await mutex
									.onDisconnect()
									.remove()
									.then();
								*/

								await mutex
									.set({
										claimTimestamp:
											firebase.database.ServerValue
												.TIMESTAMP,
										id,
										timestamp:
											firebase.database.ServerValue
												.TIMESTAMP,
										...(reason ? {reason} : {})
									})
									.then();

								return getLockTimestamp();
							}
							catch (err) {
								await mutex.remove().then();
								throw err;
							}
						});

					const surrenderLock = async () => {
						if (!isActive) {
							return;
						}

						isActive = false;

						if (lockData.stillOwner.value) {
							lockData.stillOwner.next(false);
						}
						lockData.stillOwner.complete();

						if (onQueueUpdate) {
							queue.off('child_added', onQueueUpdate);
							queue.off('child_changed', onQueueUpdate);
							queue.off('child_removed', onQueueUpdate);
						}

						await retryUntilSuccessful(async () =>
							mutex.remove().then()
						);
					};

					const updateLock = async () =>
						retryUntilSuccessful(async () => {
							await mutex
								.child('timestamp')
								.set(firebase.database.ServerValue.TIMESTAMP)
								.then();
							return getLockTimestamp();
						});

					try {
						let lastUpdate = await contendForLock();

						(async () => {
							while (isActive) {
								if (
									lockData.stillOwner.value &&
									(await getTimestamp()) - lastUpdate >=
										this.lockLeaseConfig
											.expirationLowerLimit
								) {
									return;
								}

								lastUpdate = await updateLock();
								await sleep(
									this.lockLeaseConfig.updateInterval
								);
							}
						})()
							.catch(() => {})
							.then(surrenderLock);

						/*
						Conflicts with workaround in constructor:

						Kill lock on disconnect
						this.connectionStatus()
							.pipe(
								filter(b => !b),
								take(1)
							)
							.toPromise()
							.then(surrenderLock);
						*/

						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						await new Promise<void>(resolve => {
							onQueueUpdate = async () =>
								localLock(async () => {
									if (!isActive) {
										return;
									}

									const value: {
										[key: string]: {
											claimTimestamp?: number;
											id?: string;
											reason?: string;
											timestamp?: number;
										};
									} = (await queue.once('value')).val() || {};

									const timestamp = await getTimestamp();

									/* Clean up expired lock claims. TODO: Handle as Cloud Function.

									for (const expiredContenderKey of Object.keys(
										value
									).filter(k => {
										const contender = value[k];
										return (
											typeof contender.timestamp ===
												'number' &&
											!isNaN(contender.timestamp) &&
											timestamp - contender.timestamp >=
												this.lockLeaseConfig
													.expirationLimit
										);
									})) {
										queue
											.child(expiredContenderKey)
											.remove();
										delete value[expiredContenderKey];
									}
									*/

									const contenders = Object.values(value)
										.filter(
											contender =>
												typeof contender.claimTimestamp ===
													'number' &&
												!isNaN(
													contender.claimTimestamp
												) &&
												typeof contender.id ===
													'string' &&
												typeof contender.timestamp ===
													'number' &&
												!isNaN(contender.timestamp) &&
												timestamp -
													contender.timestamp <
													this.lockLeaseConfig
														.expirationLimit
										)
										.sort(
											(a, b) =>
												<number> a.claimTimestamp -
												<number> b.claimTimestamp
										);

									const o = contenders[0] || {
										claimTimestamp: NaN,
										id: '',
										reason: undefined,
										timestamp: NaN
									};

									if (o.id !== id) {
										lastReason =
											typeof o.reason === 'string' ?
												o.reason :
												undefined;
									}

									/* Claiming lock for the first time */
									if (
										o.id === id &&
										!lockData.stillOwner.value
									) {
										lockData.reason = lastReason;
										lockData.stillOwner.next(true);
										resolve();
									}
									/* Losing claim to lock */
									else if (
										o.id !== id &&
										lockData.stillOwner.value
									) {
										surrenderLock();
									}
								});

							queue.on('child_added', onQueueUpdate);
							queue.on('child_changed', onQueueUpdate);
							queue.on('child_removed', onQueueUpdate);

							onQueueUpdate();
						});

						return await f(lockData);
					}
					finally {
						await surrenderLock();
					}
				},
				reason
			)
		);
	}

	/** @inheritDoc */
	public async lockStatus (
		urlPromise: MaybePromise<string>
	) : Promise<{
		locked: boolean;
		reason: string | undefined;
	}> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			const value: {
				[key: string]: {
					id?: string;
					reason?: string;
					timestamp?: number;
				};
			} =
				(await (await this.getDatabaseRef(url)).once('value')).val() ||
				{};

			const keys = Object.keys(value).sort();
			const reason = (value[keys[0]] || {reason: undefined}).reason;

			return {
				locked: keys.length > 0,
				reason: typeof reason === 'string' ? reason : undefined
			};
		});
	}

	/** @inheritDoc */
	public async login (username: string, password: string) : Promise<void> {
		return this.ngZone.runOutsideAngular(async () => {
			const auth = (await this.app).auth();

			if (firebase.auth) {
				await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
			}

			await auth.signInWithEmailAndPassword(
				this.usernameToEmail(username),
				password
			);
		});
	}

	/** @inheritDoc */
	public async logout () : Promise<void> {
		try {
			await this.ngZone.runOutsideAngular(async () =>
				(await this.app).auth().signOut()
			);
		}
		catch {}
	}

	/** @inheritDoc */
	public async pushItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value:
			| T
			| ((
					key: string,
					previousKey: () => Promise<string | undefined>,
					o: {callback?: () => MaybePromise<void>}
			  ) => MaybePromise<T>),
		forcePushWithKeyCallback: boolean = false
	) : Promise<{
		hash: string;
		url: string;
	}> {
		const url = await urlPromise;

		const pushItemWithKeyCallbackInternal = async () => {
			const listRef = await this.getDatabaseRef(url);

			const itemRef = listRef.push();

			/*
			Conflicts with workaround in constructor:

			const itemRefOnDisconnect = itemRef.onDisconnect();

			itemRefOnDisconnect.remove();
			*/

			const key = itemRef.key;

			if (!key) {
				throw new Error(`Failed to push item to ${url}.`);
			}

			const previousKey = async () : Promise<string | undefined> =>
				retryUntilSuccessful(async () => {
					const listValueMap: Record<string, any> =
						(await listRef
							.orderByKey()
							.limitToLast(1)
							.once('value')).val() || {};

					return Object.keys(listValueMap)[0];
				});

			const o: {callback?: () => Promise<void>} = {};

			if (typeof value === 'function') {
				value = await (<
					(
						key: string,
						previousKey: () => Promise<string | undefined>,
						o: {callback?: () => MaybePromise<void>}
					) => MaybePromise<T>
				> value)(key, previousKey, o);
			}

			const result = await this.setItem(`${url}/${key}`, proto, value);

			/*
			Conflicts with workaround in constructor:

			itemRefOnDisconnect.cancel();
			*/

			if (o.callback) {
				await o.callback();
			}

			return result;
		};

		const pushItemWithKeyCallback = async () =>
			retryUntilSuccessful(async () =>
				Promise.race([
					this.lock(
						`pushLocks/${url}`,
						pushItemWithKeyCallbackInternal
					),
					sleep(this.pushItemTimeout).then(async () => {
						throw new Error('PushItem timeout.');
					})
				])
			);

		return this.ngZone.runOutsideAngular(async () =>
			getOrSetDefault(
				this.pushItemLocks,
				url,
				lockFunction
			)(async () => {
				if (forcePushWithKeyCallback || typeof value === 'function') {
					return pushItemWithKeyCallback();
				}

				return this.setItem<T>(url, proto, value, undefined, true);
			})
		);
	}

	/** @inheritDoc */
	public async pushNotificationsSubscribe (
		callback: string | ((data: any) => void),
		callbackFunction?: (data: any) => void
	) : Promise<void> {
		const event = typeof callback === 'string' ? callback : undefined;
		const handler =
			typeof callbackFunction === 'function' ?
				callbackFunction :
			typeof callback === 'function' ?
				callback :
				undefined;

		if (!handler) {
			throw new Error('Invalid push notification subscription handler.');
		}

		if (this.cordova) {
			this.cordova.messaging.on(event || 'notification', handler);

			await Promise.all(
				[
					{
						description: 'Push notifications',
						id: 'cyph-notifications',
						importance: 4
					},
					{
						description: 'Ringing push notifications',
						id: 'cyph-rings',
						importance: 5,
						sound: 'ringtone'
					}
				].map(
					async o =>
						new Promise<void>((resolve, reject) => {
							(<any> self).PushNotification.createChannel(
								resolve,
								reject,
								{
									...o,
									visibility: 1
								}
							);
						})
				)
			).catch(() => {});

			return;
		}

		if (event || !navigator.serviceWorker) {
			return;
		}

		const handleDesktopNotification = (
			data: any,
			foreground: boolean = false
		) => {
			if (typeof data !== 'object') {
				return;
			}

			if (typeof data.additionalData !== 'object') {
				data.additionalData = data.data;
			}

			if (typeof data.additionalData === 'object') {
				data.additionalData.foreground = foreground;
			}

			if (typeof data.message !== 'string') {
				data.message = data.notification?.body;
			}

			debugLog(() => ({pushNotification: data}));
			handler(data);
		};

		navigator.serviceWorker.addEventListener('message', (e: any) => {
			handleDesktopNotification(e?.data?.notification?.FCM_MSG);
		});

		(await this.app).messaging().onMessage(payload => {
			handleDesktopNotification(payload, true);
		});
	}

	/** @inheritDoc */
	public async registerPushNotifications (
		urlPromise: MaybePromise<string>
	) : Promise<void> {
		const url = await urlPromise;
		const messaging = await this.messaging;

		await this.ngZone.runOutsideAngular(async () => {
			let oldMessagingToken = await this.localStorageService
				.getItem('FirebaseDatabaseService.messagingToken', StringProto)
				.catch(() => undefined);

			if (messaging.token) {
				await this.localStorageService.setItem(
					'FirebaseDatabaseService.messagingToken',
					StringProto,
					messaging.token
				);
			}
			else if (oldMessagingToken) {
				messaging.token = oldMessagingToken;
				oldMessagingToken = undefined;
			}

			if (!messaging.token) {
				return;
			}

			const ref = await this.getDatabaseRef(url);

			await Promise.all([
				ref
					.child(messaging.token)
					.set(this.envService.platform)
					.then(),
				oldMessagingToken && oldMessagingToken !== messaging.token ?
					ref
						.child(oldMessagingToken)
						.remove()
						.then() :
					undefined
			]);
		});
	}

	/** @inheritDoc */
	public async removeItem (urlPromise: MaybePromise<string>) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			(await this.getDatabaseRef(url)).remove().then();
			this.cache.removeItem(url);
		});
	}

	/** @inheritDoc */
	public async setConnectTracker (
		urlPromise: MaybePromise<string>,
		onReconnect?: () => void
	) : Promise<() => void> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			const ref = await this.getDatabaseRef(url);
			const onDisconnect = ref.onDisconnect();

			await onDisconnect.remove().then();

			const sub = this.connectionStatus()
				.pipe(skip(1))
				.subscribe(isConnected => {
					if (!isConnected) {
						return;
					}
					ref.set(firebase.database.ServerValue.TIMESTAMP);
					if (onReconnect) {
						onReconnect();
					}
				});

			await ref.set(firebase.database.ServerValue.TIMESTAMP).then();

			return async () => {
				sub.unsubscribe();
				await ref.remove().then();
				await onDisconnect.cancel().then();
			};
		});
	}

	/** @inheritDoc */
	public async setDisconnectTracker (
		urlPromise: MaybePromise<string>,
		onReconnect?: () => void
	) : Promise<() => void> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			const ref = await this.getDatabaseRef(url);
			const onDisconnect = ref.onDisconnect();

			await onDisconnect
				.set(firebase.database.ServerValue.TIMESTAMP)
				.then();

			const sub = this.connectionStatus()
				.pipe(skip(1))
				.subscribe(isConnected => {
					if (!isConnected) {
						return;
					}
					ref.remove();
					if (onReconnect) {
						onReconnect();
					}
				});

			await ref.remove().then();

			return async () => {
				sub.unsubscribe();
				await ref.set(firebase.database.ServerValue.TIMESTAMP).then();
				await onDisconnect.cancel().then();
			};
		});
	}

	/** @inheritDoc */
	public async setItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		progress?: BehaviorSubject<number>,
		push: boolean = false
	) : Promise<{
		hash: string;
		url: string;
	}> {
		return this.ngZone.runOutsideAngular(async () =>
			retryUntilSuccessful(async () => {
				if (progress) {
					this.ngZone.run(() => {
						progress.next(0);
					});
				}

				const url = await urlPromise;
				let fullURL = url;

				const data = await serialize(proto, value);
				const hash = uuid();

				const setDatabaseValue = async (
					o: Record<string, any> = {}
				) => {
					const databaseRef = await this.getDatabaseRef(url);

					const databaseValue = {
						...o,
						hash,
						timestamp: firebase.database.ServerValue.TIMESTAMP
					};

					if (!push) {
						return databaseRef.set(databaseValue).then();
					}

					const key = (await databaseRef.push(databaseValue).then())
						.key;

					if (!key) {
						throw new Error(`Failed to push item to ${url}.`);
					}

					fullURL = `${url}/${key}`;
				};

				if (
					push ||
					/* eslint-disable-next-line @typescript-eslint/tslint/config */
					hash !==
						(await this.getMetadata(url).catch(() => ({
							hash: undefined
						}))).hash
				) {
					if (push || data.length < this.nonBlobStorageLimit) {
						if (data.length >= this.nonBlobStoragePushLimit) {
							return this.pushItem(url, proto, value, true);
						}

						await setDatabaseValue({
							data: this.potassiumService.toBase64(data)
						});
					}
					else {
						const uploadTask = (await this.getStorageRef(
							url,
							hash
						)).put(new Blob([data]));

						if (progress) {
							uploadTask.on(
								firebase.storage.TaskEvent.STATE_CHANGED,
								snapshot => {
									progress.next(
										Math.floor(
											(snapshot.bytesTransferred /
												snapshot.totalBytes) *
												100
										)
									);
								}
							);
						}

						await uploadTask.then();
						await setDatabaseValue();
					}

					this.cache.setItem(fullURL, data, hash);
				}

				if (progress) {
					this.ngZone.run(() => {
						progress.next(100);
						progress.complete();
					});
				}

				return {hash, url: fullURL};
			})
		);
	}

	/** @inheritDoc */
	public async unregister (
		username: string,
		password: string
	) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			await this.login(username, password);

			const {currentUser} = (await this.app).auth();
			if (currentUser) {
				await currentUser.delete().then();
			}
		});
	}

	/** @inheritDoc */
	public async unregisterPushNotifications (
		urlPromise: MaybePromise<string>
	) : Promise<void> {
		try {
			const url = await urlPromise;

			await this.ngZone.runOutsideAngular(async () => {
				try {
					if (this.cordova) {
						this.cordova.messaging.unregister();
					}
				}
				catch {}

				const messagingToken = await this.localStorageService
					.getItem(
						'FirebaseDatabaseService.messagingToken',
						StringProto
					)
					.catch(() => undefined);

				if (!messagingToken) {
					return;
				}

				await (await this.getDatabaseRef(url))
					.child(messagingToken)
					.remove()
					.then();
			});
		}
		catch {}
	}

	/** @inheritDoc */
	public uploadItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value: T
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const cancel = resolvable();
		const progress = new BehaviorSubject(0);

		const result = this.setItem(urlPromise, proto, value, progress);

		return {cancel: cancel.resolve, progress, result};
	}

	/** @inheritDoc */
	public async waitForUnlock (
		urlPromise: MaybePromise<string>
	) : Promise<{
		reason: string | undefined;
		wasLocked: boolean;
	}> {
		return this.ngZone.runOutsideAngular(
			async () =>
				new Promise<{
					reason: string | undefined;
					wasLocked: boolean;
				}>(async resolve => {
					const url = await urlPromise;

					let reason: string | undefined;
					let wasLocked = false;

					const localLock = lockFunction();

					(await this.getDatabaseRef(url)).on(
						'value',
						async snapshot =>
							localLock(async () => {
								const value: {
									[key: string]: {
										claimTimestamp?: number;
										id?: string;
										reason?: string;
										timestamp?: number;
									};
								} = snapshot?.val() || {};

								const keys = Object.keys(value);

								if (keys.length < 1) {
									resolve({reason, wasLocked});
									return;
								}

								const timestamp = await getTimestamp();

								const contenders = keys
									.map(k => value[k])
									.filter(
										contender =>
											typeof contender.claimTimestamp ===
												'number' &&
											!isNaN(contender.claimTimestamp) &&
											typeof contender.id === 'string' &&
											typeof contender.timestamp ===
												'number' &&
											!isNaN(contender.timestamp) &&
											timestamp - contender.timestamp <
												this.lockLeaseConfig
													.expirationLimit
									)
									.sort(
										(a, b) =>
											<number> a.claimTimestamp -
											<number> b.claimTimestamp
									);

								if (contenders.length > 0) {
									reason = contenders[0].reason;
									reason =
										typeof reason === 'string' ?
											reason :
											undefined;
									wasLocked = true;
									return;
								}

								resolve({reason, wasLocked});
							})
					);
				})
		);
	}

	/** @inheritDoc */
	public watch<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T>> {
		return getOrSetDefaultObservable(
			this.observableCaches.watch,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<ITimedValue<T>>(observer => {
							let cleanup: () => void;
							let lastValue: T | undefined;

							const localLock = lockFunction();

							const onValue = async (
								/* eslint-disable-next-line no-null/no-null */
								snapshot: firebase.database.DataSnapshot | null
							) =>
								localLock(async () => {
									const url = await urlPromise;

									try {
										if (!snapshot || !snapshot.exists()) {
											throw new Error('Data not found.');
										}

										const result = await this.downloadItem(
											url,
											proto
										).result;

										if (
											result.value !== lastValue &&
											!(
												ArrayBuffer.isView(
													result.value
												) &&
												ArrayBuffer.isView(lastValue) &&
												this.potassiumService.compareMemory(
													result.value,
													lastValue
												)
											)
										) {
											this.ngZone.run(() => {
												observer.next(result);
											});
										}

										lastValue = result.value;
									}
									catch {
										lastValue = undefined;
										const timestamp = await getTimestamp();
										this.ngZone.run(() => {
											observer.next({
												timestamp,
												value: proto.create()
											});
										});
									}
								});

							(async () => {
								const url = await urlPromise;

								const ref = await this.getDatabaseRef(url);
								ref.on('value', onValue);
								cleanup = () => {
									ref.off('value', onValue);
								};
							})();

							return async () => {
								(await waitForValue(() => cleanup))();
							};
						})
				),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchExists (
		urlPromise: MaybePromise<string>,
		subscriptions?: Subscription[]
	) : Observable<boolean> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchExists,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<boolean>(observer => {
							let cleanup: () => void;

							const onValue = (
								/* eslint-disable-next-line no-null/no-null */
								snapshot: firebase.database.DataSnapshot | null
							) => {
								this.ngZone.run(() => {
									observer.next(
										!!snapshot && snapshot.exists()
									);
								});
							};

							(async () => {
								const url = await urlPromise;

								const ref = await this.getDatabaseRef(url);
								ref.on('value', onValue);
								cleanup = () => {
									ref.off('value', onValue);
								};
							})();

							return async () => {
								(await waitForValue(() => cleanup))();
							};
						})
				),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchList<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T>[]> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchList,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<ITimedValue<T>[]>(observer => {
							let cleanup: () => void;

							(async () => {
								const url = await urlPromise;

								const data = new Map<
									string,
									{hash: string; timestamp: number; value: T}
								>();

								const listRef = await this.getDatabaseRef(url);
								let initiated = false;

								const initialValues =
									(await listRef.once('value')).val() || {};

								const getValue = async (snapshot: {
									/* eslint-disable-next-line no-null/no-null */
									key?: string | null;
									val: () => any;
								}) => {
									if (!snapshot.key) {
										return false;
									}
									const {
										hash,
										timestamp
									} = snapshot.val() || {
										hash: undefined,
										timestamp: undefined
									};
									if (
										typeof hash !== 'string' ||
										typeof timestamp !== 'number'
									) {
										return false;
									}
									data.set(snapshot.key, {
										hash,
										timestamp,
										value: await this.getItem(
											`${url}/${snapshot.key}`,
											proto
										)
									});
									return true;
								};

								const publishList = async () => {
									this.ngZone.run(async () => {
										observer.next(
											(await this.getListKeysInternal(
												data
											)).map(k => {
												const o = data.get(k);
												if (!o) {
													throw new Error(
														'Corrupt Map.'
													);
												}
												return {
													timestamp: o.timestamp,
													value: o.value
												};
											})
										);
									});
								};

								const localLock = lockFunction();

								const onChildAdded = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null
								) : Promise<void> =>
									localLock(async () => {
										if (
											snapshot?.key &&
											typeof (snapshot.val() || {})
												.hash !== 'string'
										) {
											return onChildAdded(
												await this.waitForValue(
													`${url}/${snapshot.key}`
												)
											);
										}
										if (
											!snapshot ||
											!snapshot.key ||
											data.has(snapshot.key) ||
											!(await getValue(snapshot))
										) {
											return;
										}
										await publishList();
									});

								const onChildChanged = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null
								) =>
									localLock(async () => {
										if (
											!snapshot ||
											!snapshot.key ||
											!(await getValue(snapshot))
										) {
											return;
										}
										await publishList();
									});

								const onChildRemoved = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null
								) =>
									localLock(async () => {
										if (!snapshot || !snapshot.key) {
											return;
										}
										data.delete(snapshot.key);
										await publishList();
									});

								const onValue = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null
								) =>
									localLock(async () => {
										if (!initiated) {
											initiated = true;
											return;
										}
										if (!snapshot || snapshot.exists()) {
											return;
										}

										this.ngZone.run(() => {
											observer.complete();
										});
									});

								for (const key of Object.keys(initialValues)) {
									await getValue({
										key,
										val: () => initialValues[key]
									});
								}
								await publishList();

								listRef.on('child_added', onChildAdded);
								listRef.on('child_changed', onChildChanged);
								listRef.on('child_removed', onChildRemoved);

								if (completeOnEmpty) {
									listRef.on('value', onValue);
								}

								cleanup = () => {
									listRef.off('child_added', onChildAdded);
									listRef.off(
										'child_changed',
										onChildChanged
									);
									listRef.off(
										'child_removed',
										onChildRemoved
									);
									listRef.off('value', onValue);
								};
							})().catch(() => {
								this.ngZone.run(() => {
									observer.next([]);
								});
								cleanup = () => {};
							});

							return async () => {
								(await waitForValue(() => cleanup))();
							};
						})
				),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchListKeyPushes (
		urlPromise: MaybePromise<string>,
		subscriptions?: Subscription[]
	) : Observable<{
		key: string;
		previousKey?: string;
	}> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListKeyPushes,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<{
							key: string;
							previousKey?: string;
						}>(observer => {
							let cleanup: () => void;

							(async () => {
								const url = await urlPromise;

								const listRef = await this.getDatabaseRef(url);

								const localLock = lockFunction();

								const onChildAdded = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null,
									/* eslint-disable-next-line no-null/no-null */
									previousKey?: string | null
								) =>
									localLock(async () =>
										this.ngZone.run(
											async () : Promise<void> => {
												if (
													snapshot?.key &&
													typeof (
														snapshot.val() || {}
													).hash !== 'string'
												) {
													return onChildAdded(
														await this.waitForValue(
															`${url}/${snapshot.key}`
														),
														previousKey
													);
												}
												if (
													!snapshot ||
													!snapshot.exists() ||
													!snapshot.key
												) {
													return;
												}

												observer.next({
													key: snapshot.key,
													previousKey:
														previousKey || undefined
												});
											}
										)
									);

								listRef.on('child_added', onChildAdded);
								cleanup = () => {
									listRef.off('child_added', onChildAdded);
								};
							})().catch(() => {
								cleanup = () => {};
							});

							return async () => {
								(await waitForValue(() => cleanup))();
							};
						})
				),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchListKeys (
		urlPromise: MaybePromise<string>,
		subscriptions?: Subscription[]
	) : Observable<string[]> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListKeys,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<string[]>(observer => {
							let cleanup: () => void;

							(async () => {
								const url = await urlPromise;

								const listRef = await this.getDatabaseRef(url);

								let keys: string[] | undefined;

								const localLock = lockFunction();

								const onValue = async (
									/* eslint-disable-next-line no-null/no-null */
									snapshot: firebase.database.DataSnapshot | null
								) =>
									localLock(async () => {
										if (!snapshot) {
											keys = undefined;
											this.ngZone.run(() => {
												observer.next([]);
											});
											return;
										}

										const val = snapshot.val() || {};
										const newKeys = await this.getListKeysInternal(
											val
										);

										if (
											keys &&
											compareArrays(keys, newKeys)
										) {
											return;
										}

										keys = Array.from(newKeys);
										this.ngZone.run(() => {
											observer.next(newKeys);
										});
									});

								listRef.on('value', onValue);
								cleanup = () => {
									listRef.off('value', onValue);
								};
							})().catch(() => {
								this.ngZone.run(() => {
									observer.next([]);
								});
								cleanup = () => {};
							});

							return async () => {
								(await waitForValue(() => cleanup))();
							};
						})
				),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchListPushes<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		noCache: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<
		ITimedValue<T> & {key: string; previousKey?: string; url: string}
	> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListPushes,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(
					() =>
						new Observable<
							ITimedValue<T> & {
								key: string;
								previousKey?: string;
								url: string;
							}
						>(observer => {
							const pushedKeys = new Set<string>();
							const keySubscriptionLock = lockFunction();

							const keySubscription = this.watchListKeys(
								urlPromise,
								subscriptions
							).subscribe(async keys =>
								keySubscriptionLock(async () => {
									const url = await urlPromise;
									const emitLock = lockFunction();

									for (let i = 0; i < keys.length; ++i) {
										const key = keys[i];

										if (pushedKeys.has(key)) {
											continue;
										}
										pushedKeys.add(key);

										const previousKey: string | undefined =
											keys[i - 1];
										const itemURL = `${url}/${key}`;

										const {result} = this.downloadItem(
											itemURL,
											proto
										);

										emitLock(async () =>
											this.ngZone.run(async () => {
												try {
													const {
														timestamp,
														value
													} = await result;

													observer.next({
														key,
														previousKey,
														timestamp,
														url: itemURL,
														value
													});
												}
												catch {
												}
												finally {
													if (noCache) {
														this.cache
															.removeItem(itemURL)
															.catch(() => {});
													}
												}
											})
										);
									}

									if (
										!(completeOnEmpty && keys.length === 0)
									) {
										return;
									}

									this.ngZone.run(() => {
										observer.complete();
									});
								})
							);

							return () => {
								keySubscription.unsubscribe();
							};
						})
				),
			subscriptions
		);
	}

	constructor (
		envService: EnvService,
		localStorageService: LocalStorageService,
		potassiumService: PotassiumService,

		/** @ignore */
		private readonly ngZone: NgZone,

		/** @ignore */
		private readonly notificationService: NotificationService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super(envService, localStorageService, potassiumService);

		/** @see https://github.com/firebase/firebase-js-sdk/issues/540#issuecomment-369984622 */
		(async () => {
			const app = await this.app;

			await app.database().goOnline();
			while (!this.destroyed.value) {
				await sleep(30000);
				await app.database().goOffline();
				await app.database().goOnline();
			}
			await app.database().goOffline();
		})();
	}
}
