/* eslint-disable max-lines */

import {Injectable, NgZone} from '@angular/core';
import {FirebaseApp, getApps, initializeApp} from 'firebase/app';
import {
	Auth,
	getAuth,
	indexedDBLocalPersistence,
	inMemoryPersistence,
	signInWithEmailAndPassword,
	updatePassword
} from 'firebase/auth';
import {
	_BrowserPollConnection,
	child as databaseRefChild,
	Database,
	DatabaseReference,
	DataSnapshot,
	get as databaseRefGet,
	getDatabase,
	goOffline as databaseRefGoOffline,
	goOnline as databaseRefGoOnline,
	limitToLast as databaseRefLimitToLast,
	off as databaseRefOff,
	onChildAdded as databaseRefOnChildAdded,
	onChildChanged as databaseRefOChildChanged,
	onChildRemoved as databaseRefOnChildRemoved,
	onDisconnect as databaseRefOnDisconnect,
	onValue as databaseRefOnValue,
	orderByKey as databaseRefOrderByKey,
	push as databaseRefPush,
	query as databaseRefQuery,
	ref as getDatabaseRef,
	refFromURL as getDatabaseRefFromURL,
	remove as databaseRefRemove,
	serverTimestamp,
	set as databaseRefSet
} from 'firebase/database';
import {
	getMessaging,
	getToken as getMessagingToken,
	isSupported as isMessagingSupported,
	Messaging,
	onMessage as onMessagingMessage
} from 'firebase/messaging';
import {
	getStorage,
	FirebaseStorage,
	getDownloadURL as getStorageDownloadURL,
	ref as getStorageRef,
	StorageReference,
	uploadBytesResumable as uploadStorageBytesResumable,
	UploadTaskSnapshot
} from 'firebase/storage';
import {BehaviorSubject, Observable, ReplaySubject, Subscription} from 'rxjs';
import {map, skip} from 'rxjs/operators';
import {env} from '../env';
import {geolocation} from '../geolocation';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {ListHoleError} from '../list-hole-error';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {BinaryProto, IDatabaseItem, StringProto} from '../proto';
import {compareArrays} from '../util/compare';
import {
	getOrSetDefault,
	getOrSetDefaultObservable
} from '../util/get-or-set-default';
import {lock, lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
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
	sleep
} from '../util/wait';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {WorkerService} from './worker.service';

try {
	_BrowserPollConnection.forceDisallow();
}
catch (err) {
	debugLogError(() => ({firebaseForceWebSocketsError: err}));
}

/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private readonly app: Promise<{
		app: FirebaseApp;
		auth: () => Auth;
		database: (databaseURL?: string) => Database;
		messaging: () => Messaging;
		storage: (storageBucket?: string) => FirebaseStorage;
	}> = this.ngZone.runOutsideAngular(async () =>
		retryUntilSuccessful(() => {
			const app = getApps()[0] || initializeApp(env.firebaseConfig);

			return {
				app,
				auth: () => getAuth(app),
				database: () => getDatabase(app),
				messaging: () => getMessaging(app),
				storage: () => getStorage(app)
			};
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

			if (!(await isMessagingSupported())) {
				return {};
			}

			const app = await this.app;
			const messaging = app.messaging();
			const serviceWorkerRegistration = await this.workerService
				.serviceWorkerRegistration;

			await this.workerService.registerServiceWorkerFunction(
				'FCM',
				this.envService.firebaseConfig,
				/* eslint-disable-next-line @typescript-eslint/no-shadow */
				config => {
					importScripts('/assets/misc/firebase-messaging-sw.js');

					(<any> self).firebaseMessaging.initializeApp(config);

					(<any> self).messaging = (<any> (
						self
					)).firebaseMessaging.getMessaging();

					(<any> self).firebaseMessaging.onBackgroundMessage(
						(<any> self).messaging,
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

			await (<any> self).Notification.requestPermission();
			return {
				token:
					(await getMessagingToken(messaging, {
						serviceWorkerRegistration
					})) || undefined
			};
		})
		.catch(() => ({}));

	/** Max number of bytes to upload to non-blob storage. */
	private readonly nonBlobStorageLimit = 8192;

	/** Max number of bytes to upload to non-blob storage in pushItem. */
	private readonly nonBlobStoragePushLimit = 4194304;

	/** @ignore */
	private readonly observableCaches = {
		connectionStatus: <Observable<boolean> | undefined> undefined,
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
	private async getDatabaseRef (url: string) : Promise<DatabaseReference> {
		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				getDatabaseRefFromURL((await this.app).database(), url) :
				getDatabaseRef(
					(await this.app).database(),
					this.processURL(url)
				)
		);
	}

	/** @ignore */
	private getListKeysInternal (
		value: Map<string, any> | Record<string, any>
	) : string[] {
		if (!value) {
			return [];
		}

		const getValue =
			value instanceof Map ?
				(k: string) => value.get(k) :
				(k: string) => value[k];

		const getKeyTimestamp = (k: string) => getValue(k).timestamp;

		let keys =
			value instanceof Map ?
				Array.from(value.keys()) :
				Object.keys(value);

		if (keys.length > 0 && typeof getKeyTimestamp(keys[0]) === 'number') {
			keys = keys.sort((a, b) =>
				getKeyTimestamp(a) > getKeyTimestamp(b) ? 1 : -1
			);
		}
		else {
			keys = keys.sort();
		}

		return keys;
	}

	/** @ignore */
	private async getStorageDownloadURL (
		storageRef: StorageReference
	) : Promise<string> {
		return this.localStorageService.getOrSetDefault(
			`FirebaseDatabaseService.getStorageDownloadURL:${storageRef.fullPath}`,
			StringProto,
			async () => promiseTimeout(getStorageDownloadURL(storageRef), 15000)
		);
	}

	/** @ignore */
	private async getStorageRef (
		url: string,
		hash: string
	) : Promise<StorageReference> {
		const fullURL = `${url}/${hash}`;

		return retryUntilSuccessful(async () =>
			getStorageRef(
				(await this.app).storage(),
				/^https?:\/\//.test(fullURL) ?
					fullURL :
					this.processURL(fullURL)
			)
		);
	}

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@${this.namespace}`;
	}

	/** @ignore */
	private async waitForValue (url: string) : Promise<DataSnapshot> {
		return new Promise<DataSnapshot>(async resolve => {
			const ref = await this.getDatabaseRef(url);

			const onValue = (
				/* eslint-disable-next-line no-null/no-null */
				snapshot: DataSnapshot | null
			) => {
				if (
					snapshot?.exists() &&
					typeof snapshot.val().hash === 'string'
				) {
					databaseRefOff(ref, 'value', onValue);
					resolve(snapshot);
				}
			};

			databaseRefOnValue(ref, onValue);
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
					url: `https://${
						(await geolocation.firebaseRegion) ||
						this.configService.defaultFirebaseRegion
					}-${
						this.envService.environment.firebase.project
					}.cloudfunctions.net/${name}`
				})
			);

			if (err !== undefined) {
				throw err;
			}

			return result;
		}
		catch (err) {
			debugLogError(() => ({databaseCallFunctionError: [name, o, err]}));

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

			await updatePassword(auth.currentUser, newPassword);
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
				(await databaseRefGet(await this.getDatabaseRef(url))).val() !==
				undefined
			);
		});
	}

	/** @inheritDoc */
	public connectionStatus () : Observable<boolean> {
		if (this.observableCaches.connectionStatus) {
			return this.observableCaches.connectionStatus;
		}

		const connectionStatus = this.ngZone.runOutsideAngular(() => {
			const subject = new ReplaySubject<boolean>(1);

			(async () => {
				const connectedRef = await this.getDatabaseRef(
					'.info/connected'
				);

				const onValue = (
					/* eslint-disable-next-line no-null/no-null */
					snapshot: DataSnapshot | null
				) => {
					if (!snapshot) {
						return;
					}

					this.ngZone.run(() => {
						subject.next(snapshot.val() === true);
					});
				};

				databaseRefOnValue(connectedRef, onValue);
			})();

			return subject;
		});

		this.observableCaches.connectionStatus = connectionStatus;

		return connectionStatus;
	}

	/** @inheritDoc */
	public downloadItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		waitUntilExists: boolean = false,
		verifyHash?: string
	) : {
		alreadyCached: Promise<boolean>;
		metadata: Promise<IDatabaseItem>;
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress = new BehaviorSubject(0);
		const alreadyCached = resolvable<boolean>();

		const metadata = this.ngZone.runOutsideAngular(async () =>
			this.getMetadata(await urlPromise, waitUntilExists)
		);

		const result = this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			const {data, hash, timestamp} = await metadata;

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
			metadata,
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
				const value = (
					await databaseRefGet(await this.getDatabaseRef(url))
				).val();
				const keys = this.getListKeysInternal(value);

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
	) : Promise<(T | ListHoleError)[]> {
		return this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			try {
				return await Promise.all(
					(
						await this.getListKeys(url)
					).map(async k =>
						this.getItem(`${url}/${k}`, proto).catch(
							() => new ListHoleError()
						)
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
				return this.getListKeysInternal(
					(await databaseRefGet(await this.getDatabaseRef(url))).val()
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
						snapshot: DataSnapshot | null
					) => {
						if (!snapshot?.exists()) {
							return;
						}

						databaseRefOff(ref, 'value', onValue);
						resolve(snapshot.val());
					};

					databaseRefOnValue(ref, onValue);
				});
			}
			else {
				val = (await databaseRefGet(ref)).val();
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

					const mutex = await databaseRefPush(queue).then();

					const getLockTimestamp = async () => {
						const o = (await databaseRefGet(mutex)).val() || {};

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
								await databaseRefSet(mutex, {
									timestamp: serverTimestamp()
								}).then();

								/*
								Conflicts with workaround in constructor:

								await mutex
									.onDisconnect()
									.remove()
									.then();
								*/

								await databaseRefSet(mutex, {
									claimTimestamp: serverTimestamp(),
									id,
									timestamp: serverTimestamp(),
									...(reason ? {reason} : {})
								}).then();

								return getLockTimestamp();
							}
							catch (err) {
								await databaseRefRemove(mutex).then();
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
							databaseRefOff(queue, 'child_added', onQueueUpdate);
							databaseRefOff(
								queue,
								'child_changed',
								onQueueUpdate
							);
							databaseRefOff(
								queue,
								'child_removed',
								onQueueUpdate
							);
						}

						await retryUntilSuccessful(async () =>
							databaseRefRemove(mutex).then()
						);
					};

					const updateLock = async () =>
						retryUntilSuccessful(async () => {
							await databaseRefSet(
								databaseRefChild(mutex, 'timestamp'),
								serverTimestamp()
							).then();
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
									} =
										(await databaseRefGet(queue)).val() ||
										{};

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

							databaseRefOnChildAdded(queue, onQueueUpdate);
							databaseRefOChildChanged(queue, onQueueUpdate);
							databaseRefOnChildRemoved(queue, onQueueUpdate);

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
	public async lockStatus (urlPromise: MaybePromise<string>) : Promise<{
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
				(await databaseRefGet(await this.getDatabaseRef(url))).val() ||
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

			await auth.setPersistence(
				this.envService.isSDK ?
					inMemoryPersistence :
					indexedDBLocalPersistence
			);

			await signInWithEmailAndPassword(
				auth,
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

			const itemRef = databaseRefPush(listRef);

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
						(
							await databaseRefGet(
								databaseRefQuery(
									listRef,
									databaseRefOrderByKey(),
									databaseRefLimitToLast(1)
								)
							)
						).val() || {};

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
			this.lock(`pushLocks/${url}`, pushItemWithKeyCallbackInternal);

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

		if (
			event ||
			typeof navigator === 'undefined' ||
			!navigator.serviceWorker
		) {
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

		onMessagingMessage((await this.app).messaging(), (payload: any) => {
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
				databaseRefSet(
					databaseRefChild(ref, messaging.token),
					this.envService.platform
				).then(),
				oldMessagingToken && oldMessagingToken !== messaging.token ?
					databaseRefRemove(
						databaseRefChild(ref, oldMessagingToken)
					).then() :
					undefined
			]);
		});
	}

	/** @inheritDoc */
	public async removeItem (urlPromise: MaybePromise<string>) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			const url = await urlPromise;

			databaseRefRemove(await this.getDatabaseRef(url)).then();
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
			const onDisconnect = databaseRefOnDisconnect(ref);

			await onDisconnect.remove().then();

			const sub = this.connectionStatus()
				.pipe(skip(1))
				.subscribe(isConnected => {
					if (!isConnected) {
						return;
					}
					databaseRefSet(ref, serverTimestamp());
					if (onReconnect) {
						onReconnect();
					}
				});

			await databaseRefSet(ref, serverTimestamp()).then();

			return async () => {
				sub.unsubscribe();
				await databaseRefRemove(ref).then();
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
			const onDisconnect = databaseRefOnDisconnect(ref);

			await onDisconnect.set(serverTimestamp()).then();

			const sub = this.connectionStatus()
				.pipe(skip(1))
				.subscribe(isConnected => {
					if (!isConnected) {
						return;
					}
					databaseRefRemove(ref);
					if (onReconnect) {
						onReconnect();
					}
				});

			await databaseRefRemove(ref).then();

			return async () => {
				sub.unsubscribe();
				await databaseRefSet(ref, serverTimestamp()).then();
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
						timestamp: serverTimestamp()
					};

					if (!push) {
						return databaseRefSet(
							databaseRef,
							databaseValue
						).then();
					}

					const key = (
						await databaseRefPush(databaseRef, databaseValue).then()
					).key;

					if (!key) {
						throw new Error(`Failed to push item to ${url}.`);
					}

					fullURL = `${url}/${key}`;
				};

				if (
					push ||
					/* eslint-disable-next-line @typescript-eslint/tslint/config */
					hash !==
						(
							await this.getMetadata(url).catch(() => ({
								hash: undefined
							}))
						).hash
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
						const uploadTask = uploadStorageBytesResumable(
							await this.getStorageRef(url, hash),
							data
						);

						if (progress) {
							uploadTask.on(
								'state_changed',
								(snapshot: UploadTaskSnapshot) => {
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

				await databaseRefRemove(
					databaseRefChild(
						await this.getDatabaseRef(url),
						messagingToken
					)
				).then();
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
	public async waitForUnlock (urlPromise: MaybePromise<string>) : Promise<{
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

					databaseRefOnValue(
						await this.getDatabaseRef(url),
						async (snapshot: DataSnapshot) =>
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
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<ITimedValue<T>>();

					let lastValue: T | undefined;

					const localLock = lockFunction();

					const onValue = async (
						/* eslint-disable-next-line no-null/no-null */
						snapshot: DataSnapshot | null
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
										ArrayBuffer.isView(result.value) &&
										ArrayBuffer.isView(lastValue) &&
										this.potassiumService.compareMemory(
											result.value,
											lastValue
										)
									)
								) {
									this.ngZone.run(() => {
										subject.next(result);
									});
								}

								lastValue = result.value;
							}
							catch {
								lastValue = undefined;
								const timestamp = await getTimestamp();
								this.ngZone.run(() => {
									subject.next({
										timestamp,
										value: proto.create()
									});
								});
							}
						});

					(async () => {
						const url = await urlPromise;

						const ref = await this.getDatabaseRef(url);
						databaseRefOnValue(ref, onValue);
					})();

					return subject;
				}),
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
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<boolean>();

					const onValue = (
						/* eslint-disable-next-line no-null/no-null */
						snapshot: DataSnapshot | null
					) => {
						this.ngZone.run(() => {
							subject.next(!!snapshot && snapshot.exists());
						});
					};

					(async () => {
						const url = await urlPromise;

						const ref = await this.getDatabaseRef(url);
						databaseRefOnValue(ref, onValue);
					})();

					return subject;
				}),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchList<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T | ListHoleError>[]> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchList,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<
						ITimedValue<T | ListHoleError>[]
					>();

					(async () => {
						const url = await urlPromise;

						const data = new Map<
							string,
							{
								hash: string;
								timestamp: number;
								value: T | ListHoleError;
							}
						>();

						const listRef = await this.getDatabaseRef(url);
						let initiated = false;

						const initialValues =
							(await databaseRefGet(listRef)).val() || {};

						const getValue = async (snapshot: {
							/* eslint-disable-next-line no-null/no-null */
							key?: string | null;
							val: () => any;
						}) => {
							if (!snapshot.key) {
								return false;
							}

							const {hash, timestamp} = snapshot.val() || {
								hash: undefined,
								timestamp: undefined
							};

							data.set(snapshot.key, {
								hash,
								timestamp,
								value:
									typeof hash === 'string' &&
									typeof timestamp === 'number' ?
										await this.getItem(
											`${url}/${snapshot.key}`,
											proto
										).catch(() => new ListHoleError()) :
										new ListHoleError()
							});

							return true;
						};

						const publishList = async () => {
							this.ngZone.run(async () => {
								subject.next(
									this.getListKeysInternal(data).map(k => {
										const o = data.get(k);
										if (!o) {
											throw new Error('Corrupt Map.');
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
							snapshot: DataSnapshot | null
						) : Promise<void> =>
							localLock(async () => {
								if (
									snapshot?.key &&
									typeof snapshot.val()?.hash !== 'string'
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
							snapshot: DataSnapshot | null
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
							snapshot: DataSnapshot | null
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
							snapshot: DataSnapshot | null
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
									subject.complete();
								});
							});

						for (const key of Object.keys(initialValues)) {
							await getValue({
								key,
								val: () => initialValues[key]
							});
						}
						await publishList();

						databaseRefOnChildAdded(listRef, onChildAdded);
						databaseRefOChildChanged(listRef, onChildChanged);
						databaseRefOnChildRemoved(listRef, onChildRemoved);

						if (completeOnEmpty) {
							databaseRefOnValue(listRef, onValue);
						}
					})().catch(() => {
						this.ngZone.run(() => {
							subject.next([]);
						});
					});

					return subject;
				}),
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
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<{
						key: string;
						previousKey?: string;
					}>();

					(async () => {
						const url = await urlPromise;

						const listRef = await this.getDatabaseRef(url);

						const localLock = lockFunction();

						const onChildAdded = async (
							/* eslint-disable-next-line no-null/no-null */
							snapshot: DataSnapshot | null,
							/* eslint-disable-next-line no-null/no-null */
							previousKey?: string | null
						) =>
							localLock(async () =>
								this.ngZone.run(async () : Promise<void> => {
									if (
										snapshot?.key &&
										typeof snapshot.val()?.hash !== 'string'
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

									subject.next({
										key: snapshot.key,
										previousKey: previousKey || undefined
									});
								})
							);

						databaseRefOnChildAdded(listRef, onChildAdded);
					})().catch(() => {});

					return subject;
				}),
			subscriptions
		);
	}

	/** @inheritDoc */
	public watchListKeys (
		urlPromise: MaybePromise<string>,
		limit?: number,
		subscriptions?: Subscription[]
	) : Observable<string[]> {
		const listKeysObservable = getOrSetDefaultObservable(
			this.observableCaches.watchListKeys,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<string[]>();

					(async () => {
						const url = await urlPromise;

						const listRef = await this.getDatabaseRef(url);

						let keys: string[] | undefined;

						const onValue = async (
							/* eslint-disable-next-line no-null/no-null */
							snapshot: DataSnapshot | null
						) => {
							if (!snapshot) {
								keys = undefined;
								this.ngZone.run(() => {
									subject.next([]);
								});
								return;
							}

							const val = snapshot.val() || {};
							const newKeys = this.getListKeysInternal(val);

							if (keys && compareArrays(keys, newKeys)) {
								return;
							}

							keys = Array.from(newKeys);
							this.ngZone.run(() => {
								subject.next(newKeys);
							});
						};

						databaseRefOnValue(listRef, onValue);
					})().catch(() => {
						this.ngZone.run(() => {
							subject.next([]);
						});
					});

					return subject;
				}),
			subscriptions
		);

		return limit !== undefined ?
			listKeysObservable.pipe(map(keys => keys.slice(-limit))) :
			listKeysObservable;
	}

	/** @inheritDoc */
	public watchListPushes<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		noCache: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<
		ITimedValue<T | ListHoleError> & {
			key: string;
			previousKey?: string;
			url: string;
		}
	> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListPushes,
			urlPromise,
			() =>
				this.ngZone.runOutsideAngular(() => {
					const subject = new ReplaySubject<
						ITimedValue<T | ListHoleError> & {
							key: string;
							previousKey?: string;
							url: string;
						}
					>();

					const pushedKeys = new Set<string>();
					const keySubscriptionLock = lockFunction();

					const keySubscription = this.watchListKeys(
						urlPromise,
						undefined,
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

								const {metadata, result} = this.downloadItem(
									itemURL,
									proto
								);

								emitLock(async () =>
									this.ngZone.run(async () => {
										try {
											const {timestamp, value} =
												await result;

											subject.next({
												key,
												previousKey,
												timestamp,
												url: itemURL,
												value
											});
										}
										catch {
											const {timestamp} =
												await metadata.catch(() => ({
													timestamp: 0
												}));

											subject.next({
												key,
												previousKey,
												timestamp,
												url: itemURL,
												value: new ListHoleError()
											});
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

							if (!(completeOnEmpty && keys.length === 0)) {
								return;
							}

							this.ngZone.run(() => {
								subject.complete();
							});
						})
					);

					if (subscriptions) {
						subscriptions.push(keySubscription);
					}

					return subject;
				}),
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
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly notificationService: NotificationService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super(envService, localStorageService, potassiumService);

		/** @see https://github.com/firebase/firebase-js-sdk/issues/540#issuecomment-369984622 */
		(async () => {
			const app = await this.app;

			databaseRefGoOnline(app.database());
			while (!this.destroyed.value) {
				await sleep(30000);
				databaseRefGoOffline(app.database());
				databaseRefGoOnline(app.database());
			}
			databaseRefGoOffline(app.database());
		})();
	}
}
