/* tslint:disable:max-file-line-count no-import-side-effect */

import {Injectable, NgZone} from '@angular/core';
import {firebase} from '@firebase/app';
import {FirebaseApp} from '@firebase/app-types';
import '@firebase/auth';
import {FirebaseAuth} from '@firebase/auth-types';
import {ServerValue} from '@firebase/database/dist/packages/database';
import {
	DataSnapshot,
	FirebaseDatabase,
	Reference as DatabaseReference
} from '@firebase/database-types';
import '@firebase/messaging';
import {FirebaseMessaging} from '@firebase/messaging-types';
import '@firebase/storage';
import {
	FirebaseStorage,
	Reference as StorageReference
} from '@firebase/storage-types';
import {BehaviorSubject, Observable} from 'rxjs';
import {skip} from 'rxjs/operators';
import {env} from '../env';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {MaybePromise} from '../maybe-promise-type';
import {BinaryProto, NotificationTypes, StringProto} from '../proto';
import {compareArrays} from '../util/compare';
import {getOrSetDefault, getOrSetDefaultObservable} from '../util/get-or-set-default';
import {lock, lockFunction} from '../util/lock';
import {requestByteStream, requestMaybeJSON} from '../util/request';
import {deserialize, serialize, stringify} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, retryUntilSuccessful, sleep, waitForValue} from '../util/wait';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {WorkerService} from './worker.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private readonly app: Promise<FirebaseApp&{
		auth: () => FirebaseAuth;
		database: (databaseURL?: string) => FirebaseDatabase;
		messaging: () => FirebaseMessaging;
		storage: (storageBucket?: string) => FirebaseStorage;
	}>	= this.ngZone.runOutsideAngular(async () => retryUntilSuccessful(() => {
		const app: any	= firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);

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
	}));

	/** Mapping of URLs to last known good hashes. */
	private readonly hashCache: Map<string, string>	= new Map<string, string>();

	/** @ignore */
	private readonly localLocks: Map<string, {}>	= new Map<string, {}>();

	/** Firebase Cloud Messaging token. */
	private readonly messagingToken: Promise<string|undefined>	=
		this.ngZone.runOutsideAngular(async () => {
			const app						= await this.app;
			const messaging					= app.messaging();
			const serviceWorkerRegistration	= await this.workerService.serviceWorkerRegistration;

			await this.workerService.serviceWorkerFunction(
				'FCM',
				this.envService.firebaseConfig,
				/* tslint:disable-next-line:no-shadowed-variable */
				config => {
					importScripts('/assets/node_modules/firebase/firebase-app.js');
					importScripts('/assets/node_modules/firebase/firebase-messaging.js');

					(<any> self).firebase.initializeApp(config);
					(<any> self).messaging	= (<any> self).firebase.messaging();
				}
			);

			messaging.useServiceWorker(serviceWorkerRegistration);
			await messaging.requestPermission();
			return (await messaging.getToken()) || undefined;
		}).catch(() =>
			undefined
		)
	;

	/** @ignore */
	private readonly observableCaches	= {
		watchExists: new Map<string, Observable<boolean>>(),
		watchListKeyPushes: new Map<string, Observable<{key: string; previousKey?: string}>>(),
		watchListKeys: new Map<string, Observable<string[]>>()
	};

	/** @ignore */
	private async cacheGet (o: {hash?: string; url?: string}) : Promise<Uint8Array> {
		const hash	= o.hash ? o.hash : o.url ? this.hashCache.get(o.url) : undefined;

		if (!hash) {
			throw new Error('Item not in cache.');
		}

		return this.localStorageService.getItem(`cache/${hash}`, BinaryProto);
	}

	/** @ignore */
	private cacheRemove (o: {hash?: string; url?: string}) : void {
		const hash	= o.hash ? o.hash : o.url ? this.hashCache.get(o.url) : undefined;

		if (o.url) {
			this.hashCache.delete(o.url);
		}
		if (hash) {
			this.localStorageService.removeItem(`cache/${hash}`);
		}
	}

	/** @ignore */
	private cacheSet (url: string, value: Uint8Array, hash: string) : void {
		this.localStorageService.setItem(`cache/${hash}`, BinaryProto, value).then(() => {
			this.hashCache.set(url, hash);
		}).catch(
			() => {}
		);
	}

	/** @ignore */
	private async getDatabaseRef (url: string) : Promise<DatabaseReference> {
		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(this.processURL(url))
		);
	}

	/** @ignore */
	private getListKeysInternal (value: Map<string, any>|{[k: string]: any}) : string[] {
		if (!value) {
			return [];
		}

		const keys		=
			(
				value instanceof Map ? Array.from(value.keys()) : Object.keys(value)
			).sort()
		;

		const endIndex	= keys.findIndex(
			value instanceof Map ?
				k => typeof value.get(k).hash !== 'string' :
				k => typeof value[k].hash !== 'string'
		);

		return endIndex >= 0 ? keys.slice(0, endIndex) : keys;
	}

	/** @ignore */
	private async getStorageRef (url: string, hash: string) : Promise<StorageReference> {
		const fullURL	= `${url}/${hash}`;

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
	private async waitForValue (url: string) : Promise<DataSnapshot> {
		return new Promise<DataSnapshot>(async resolve => {
			(await this.getDatabaseRef(url)).on('value', snapshot => {
				if (snapshot && snapshot.exists() && typeof snapshot.val().hash === 'string') {
					resolve(snapshot);
				}
			});
		});
	}

	/** @inheritDoc */
	protected processURL (url: string) : string {
		return url.startsWith('.') ? url : super.processURL(url);
	}

	/** @inheritDoc */
	public async callFunction (name: string, data: any) : Promise<any> {
		return requestMaybeJSON({
			contentType: 'application/json',
			data: stringify(data),
			method: 'POST',
			url:
				/* TODO: Determine how to detect this after more regions are supported */
				`https://us-central1-${
					this.envService.firebaseConfig.projectId
				}.cloudfunctions.net/${name}`
		});
	}

	/** @inheritDoc */
	public async changePassword (
		username: string,
		oldPassword: string,
		newPassword: string
	) : Promise<void> {
		return this.ngZone.runOutsideAngular(async () => {
			await this.login(username, oldPassword);

			const auth	= await (await this.app).auth();

			if (
				!auth.currentUser ||
				!auth.currentUser.email ||
				auth.currentUser.email.split('@')[0].toLowerCase() !== username.toLowerCase()
			) {
				throw new Error('Failed to change password.');
			}

			await auth.currentUser.updatePassword(newPassword);
			await this.login(username, newPassword);
		});
	}

	/** @inheritDoc */
	public async checkDisconnected (urlPromise: MaybePromise<string>) : Promise<boolean> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			return (await (await this.getDatabaseRef(url)).once('value')).val() !== undefined;
		});
	}

	/** @inheritDoc */
	public connectionStatus () : Observable<boolean> {
		return this.ngZone.runOutsideAngular(() => new Observable<boolean>(observer => {
			let cleanup: Function;

			(async () => {
				const connectedRef	= await this.getDatabaseRef('.info/connected');

				/* tslint:disable-next-line:no-null-keyword */
				const onValue		= async (snapshot: DataSnapshot|null) => {
					if (snapshot) {
						this.ngZone.run(() => {
							observer.next(snapshot.val() === true);
						});
					}
				};

				connectedRef.on('value', onValue);
				cleanup	= () => { connectedRef.off('value', onValue); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		}));
	}

	/** @inheritDoc */
	public downloadItem<T> (urlPromise: MaybePromise<string>, proto: IProto<T>) : {
		alreadyCached: Promise<boolean>;
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress		= new BehaviorSubject(0);
		const alreadyCached	= resolvable<boolean>();

		return {
			alreadyCached: alreadyCached.promise,
			progress,
			result: this.ngZone.runOutsideAngular(async () => {
				const url	= await urlPromise;

				const {data, hash, timestamp}	= await this.getMetadata(url);

				try {
					const localData		= await this.cacheGet({hash}).catch(err => {
						if (data === undefined) {
							throw err;
						}
						return this.potassiumService.fromBase64(data);
					});

					const localValue	= await deserialize(proto, localData);

					alreadyCached.resolve(true);
					this.ngZone.run(() => {
						progress.next(100);
						progress.complete();
					});

					return {timestamp, value: localValue};
				}
				catch {}

				alreadyCached.resolve(false);
				this.ngZone.run(() => { progress.next(0); });

				const storageRef	= await this.getStorageRef(url, hash);

				const req	= requestByteStream({
					retries: 3,
					url: await retryUntilSuccessful(async () => storageRef.getDownloadURL())
				});

				req.progress.subscribe(
					n => { this.ngZone.run(() => { progress.next(n); }); },
					err => { this.ngZone.run(() => { progress.next(err); }); }
				);

				const value	= await req.result;

				this.ngZone.run(() => {
					progress.next(100);
					progress.complete();
				});
				this.cacheSet(url, value, hash);
				return {timestamp, value: await deserialize(proto, value)};
			})
		};
	}

	/** @inheritDoc */
	public async getLatestKey (urlPromise: MaybePromise<string>) : Promise<string|undefined> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			try {
				const value	= (await (await this.getDatabaseRef(url)).once('value')).val();
				const keys	= await this.getListKeysInternal(value);

				return keys.
					filter(k => !isNaN(value[k].timestamp)).
					sort((a, b) => value[b].timestamp - value[a].timestamp)
				[0];
			}
			catch {
				return undefined;
			}
		});
	}

	/** @inheritDoc */
	public async getList<T> (urlPromise: MaybePromise<string>, proto: IProto<T>) : Promise<T[]> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			try {
				return await Promise.all((await this.getListKeys(url)).map(async k =>
					this.getItem(`${url}/${k}`, proto)
				));
			}
			catch {
				return [];
			}
		});
	}

	/** @inheritDoc */
	public async getListKeys (urlPromise: MaybePromise<string>) : Promise<string[]> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			try {
				return this.getListKeysInternal(
					(await (await this.getDatabaseRef(url)).once('value')).val()
				);
			}
			catch {
				return [];
			}
		});
	}

	/** @inheritDoc */
	public async getMetadata (urlPromise: MaybePromise<string>) : Promise<{
		data?: string;
		hash: string;
		timestamp: number;
	}> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			const {data, hash, timestamp}	=
				(await (await this.getDatabaseRef(url)).once('value')).val() ||
				{data: undefined, hash: undefined, timestamp: undefined}
			;

			if (typeof hash !== 'string' || typeof timestamp !== 'number') {
				throw new Error(`Item at ${url} not found.`);
			}

			return {hash, timestamp, ...(typeof data === 'string' ? {data} : {})};
		});
	}

	/** @inheritDoc */
	public async hasItem (urlPromise: MaybePromise<string>) : Promise<boolean> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			const metadata	= await this.getMetadata(url);

			if (metadata.data === undefined) {
				await (await this.getStorageRef(url, metadata.hash)).getDownloadURL();
			}
		}).
			then(() => true).
			catch(() => false)
		;
	}

	/** @inheritDoc */
	public async lock<T> (
		urlPromise: MaybePromise<string>,
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string,
		global: boolean = true
	) : Promise<T> {
		const url	= await this.lockURL(urlPromise, global);

		return this.ngZone.runOutsideAngular(async () => lock(
			getOrSetDefault<string, {}>(this.localLocks, url, () => ({})),
			async () => {
				let lastReason: string|undefined;
				let onQueueUpdate: (() => Promise<void>)|undefined;

				const queue		= await this.getDatabaseRef(url);
				const localLock	= lockFunction();
				const id		= uuid();
				let isActive	= true;

				const lockData: {
					reason?: string;
					stillOwner: BehaviorSubject<boolean>;
				}	= {
					stillOwner: new BehaviorSubject(false)
				};

				const mutex	= await queue.push().then();

				const getLockTimestamp	= async () => {
					const o	= (await mutex.once('value')).val();

					if (
						typeof o.id !== 'string' ||
						!o.id ||
						typeof o.timestamp !== 'number' ||
						isNaN(o.timestamp)
					) {
						throw new Error('Invalid server timestamp.');
					}

					return o.timestamp;
				};

				const contendForLock	= async () => retryUntilSuccessful(async () => {
					try {
						await mutex.set({timestamp: ServerValue.TIMESTAMP}).then();
						await mutex.onDisconnect().remove().then();
						await mutex.set({
							claimTimestamp: ServerValue.TIMESTAMP,
							id,
							timestamp: ServerValue.TIMESTAMP,
							...(reason ? {reason} : {})
						}).then();
						return getLockTimestamp();
					}
					catch (err) {
						await mutex.remove().then();
						throw err;
					}
				});

				const surrenderLock		= async () => {
					isActive	= false;

					if (lockData.stillOwner.value) {
						lockData.stillOwner.next(false);
					}
					lockData.stillOwner.complete();

					if (onQueueUpdate) {
						queue.off('child_added', onQueueUpdate);
						queue.off('child_changed', onQueueUpdate);
						queue.off('child_removed', onQueueUpdate);
					}

					await retryUntilSuccessful(async () => mutex.remove().then());
				};

				const updateLock		= async () => retryUntilSuccessful(async () => {
					await mutex.child('timestamp').set(ServerValue.TIMESTAMP).then();
					return getLockTimestamp();
				});


				try {
					let lastUpdate	= await contendForLock();

					(async () => {
						while (isActive) {
							if (
								lockData.stillOwner.value &&
								(
									(await getTimestamp()) - lastUpdate
								) >= this.lockLeaseConfig.expirationLowerLimit
							) {
								return;
							}

							lastUpdate	= await updateLock();
							await sleep(this.lockLeaseConfig.updateInterval);
						}
					})().
						catch(() => {}).
						then(surrenderLock)
					;

					/* tslint:disable-next-line:promise-must-complete */
					await new Promise<void>(resolve => {
						onQueueUpdate	= async () => localLock(async () => {
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
							}	=
								(await queue.once('value')).val() || {}
							;

							const timestamp	= await getTimestamp();

							/* Clean up expired lock claims. TODO: Handle as Cloud Function.

							for (const expiredContenderKey of Object.keys(value).filter(k => {
								const contender	= value[k];
								return (
									typeof contender.timestamp === 'number' &&
									!isNaN(contender.timestamp) &&
									(
										timestamp - contender.timestamp
									) >= this.lockLeaseConfig.expirationLimit
								);
							})) {
								queue.child(expiredContenderKey).remove();
								delete value[expiredContenderKey];
							}
							*/

							const contenders	= Object.keys(value).
								map(k => value[k]).
								filter(contender =>
									typeof contender.claimTimestamp === 'number' &&
									!isNaN(contender.claimTimestamp) &&
									typeof contender.id === 'string' &&
									typeof contender.timestamp === 'number' &&
									!isNaN(contender.timestamp) &&
									(
										timestamp - contender.timestamp
									) < this.lockLeaseConfig.expirationLimit
								).
								sort((a, b) =>
									(<number> a.claimTimestamp) - (<number> b.claimTimestamp)
								)
							;

							const o	= contenders[0] || {
								claimTimestamp: NaN,
								id: '',
								reason: undefined,
								timestamp: NaN
							};

							if (o.id !== id) {
								lastReason	= typeof o.reason === 'string' ? o.reason : undefined;
							}

							/* Claiming lock for the first time */
							if (o.id === id && !lockData.stillOwner.value) {
								lockData.reason	= lastReason;
								lockData.stillOwner.next(true);
								resolve();
							}
							/* Losing claim to lock */
							else if (o.id !== id && lockData.stillOwner.value) {
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
		));
	}

	/** @inheritDoc */
	public async lockStatus (urlPromise: MaybePromise<string>) : Promise<{
		locked: boolean;
		reason: string|undefined;
	}> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			const value: {[key: string]: {id?: string; reason?: string; timestamp?: number}}	=
				(await (await this.getDatabaseRef(url)).once('value')).val() || {}
			;

			const keys		= Object.keys(value).sort();
			const reason	= (value[keys[0]] || {reason: undefined}).reason;

			return {
				locked: keys.length > 0,
				reason: typeof reason === 'string' ? reason : undefined
			};
		});
	}

	/** @inheritDoc */
	public async login (username: string, password: string) : Promise<void> {
		return this.ngZone.runOutsideAngular(async () => {
			const auth	= await (await this.app).auth();

			if (firebase.auth) {
				await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
			}

			await auth.signInWithEmailAndPassword(this.usernameToEmail(username), password);
		});
	}

	/** @inheritDoc */
	public async logout () : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => retryUntilSuccessful(async () =>
			(await this.app).auth().signOut()
		));
	}

	/** @inheritDoc */
	public async notify (
		urlPromise: MaybePromise<string>,
		targetPromise: MaybePromise<string>,
		notificationType: NotificationTypes,
		metadata?: {id: string}&{[k: string]: any}
	) : Promise<void> {
		const url		= await urlPromise;
		const target	= await targetPromise;

		await this.ngZone.runOutsideAngular(async () =>
			(await this.getDatabaseRef(url)).push(
				{target, type: notificationType, ...(metadata ? {metadata} : {})}
			).then()
		);
	}

	/** @inheritDoc */
	public async pushItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value: T|((
			key: string,
			previousKey: () => Promise<string|undefined>,
			o: {callback?: () => MaybePromise<void>}
		) => MaybePromise<T>),
		noBlobStorage: boolean = false
	) : Promise<{
		hash: string;
		url: string;
	}> {
		const url	= await urlPromise;

		return this.ngZone.runOutsideAngular(async () => {
			const listRef				= await this.getDatabaseRef(url);

			const initialItemRef		= listRef.push({timestamp: ServerValue.TIMESTAMP});
			const itemRefOnDisconnect	= initialItemRef.onDisconnect();

			itemRefOnDisconnect.remove();

			const itemRef				= await initialItemRef.then();
			const key					= itemRef.key;

			if (!key) {
				throw new Error(`Failed to push item to ${url}.`);
			}

			const previousKey	= async () : Promise<string|undefined> =>
				retryUntilSuccessful(async () => {
					const listValueMap: {[k: string]: any}	=
						(
							await listRef.
								orderByKey().
								endAt(key).
								limitToLast(2).
								once('value')
						).val()
					;

					if (!(key in listValueMap)) {
						throw new Error(`Key ${key} not found in list at ${url}.`);
					}

					return Object.keys(listValueMap).find(k => k !== key);
				})
			;

			const o: {callback?: () => Promise<void>}	= {};

			if (typeof value === 'function') {
				value	= await value(key, previousKey, o);
			}

			const result	= await this.setItem(`${url}/${key}`, proto, value, noBlobStorage);
			await itemRefOnDisconnect.cancel();

			if (o.callback) {
				await o.callback();
			}

			return result;
		});
	}

	/** @inheritDoc */
	public async register (username: string, password: string) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			await (await this.app).auth().createUserWithEmailAndPassword(
				this.usernameToEmail(username),
				password
			);

			await this.login(username, password);
		});
	}

	/** @inheritDoc */
	public async registerPushNotifications (urlPromise: MaybePromise<string>) : Promise<void> {
		const url			= await urlPromise;
		let messagingToken	= await this.messagingToken;

		await this.ngZone.runOutsideAngular(async () => {
			let oldMessagingToken	= await this.localStorageService.getItem(
				'FirebaseDatabaseService.messagingToken',
				StringProto
			).catch(() =>
				undefined
			);

			if (messagingToken) {
				await this.localStorageService.setItem(
					'FirebaseDatabaseService.messagingToken',
					StringProto,
					messagingToken
				);
			}
			else if (oldMessagingToken) {
				messagingToken		= oldMessagingToken;
				oldMessagingToken	= undefined;
			}

			if (!messagingToken) {
				return;
			}

			const ref	= await this.getDatabaseRef(url);

			await Promise.all([
				ref.child(messagingToken).set(true).then(),
				oldMessagingToken ? ref.child(oldMessagingToken).remove().then() : undefined
			]);
		});
	}

	/** @inheritDoc */
	public async removeItem (urlPromise: MaybePromise<string>) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			(await this.getDatabaseRef(url)).remove().then();
			this.cacheRemove({url});
		});
	}

	/** @inheritDoc */
	public async setConnectTracker (
		urlPromise: MaybePromise<string>,
		onReconnect?: () => void
	) : Promise<() => void> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			const ref			= await this.getDatabaseRef(url);
			const onDisconnect	= ref.onDisconnect();

			await onDisconnect.remove().then();

			this.connectionStatus().pipe(skip(1)).subscribe(isConnected => {
				if (!isConnected) {
					return;
				}
				ref.set(ServerValue.TIMESTAMP);
				if (onReconnect) {
					onReconnect();
				}
			});

			await ref.set(ServerValue.TIMESTAMP).then();

			return async () => {
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
			const url	= await urlPromise;

			const ref			= await this.getDatabaseRef(url);
			const onDisconnect	= ref.onDisconnect();

			await onDisconnect.set(ServerValue.TIMESTAMP).then();

			this.connectionStatus().pipe(skip(1)).subscribe(isConnected => {
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
				await ref.set(ServerValue.TIMESTAMP).then();
				await onDisconnect.cancel().then();
			};
		});
	}

	/** @inheritDoc */
	public async setItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		noBlobStorage: boolean = false
	) : Promise<{
		hash: string;
		url: string;
	}> {
		return this.ngZone.runOutsideAngular(async () => {
			const url	= await urlPromise;

			const data	= await serialize(proto, value);
			const hash	= this.potassiumService.toHex(
				await this.potassiumService.hash.hash(data)
			);

			/* tslint:disable-next-line:possible-timing-attack */
			if (hash !== (await this.getMetadata(url).catch(() => ({hash: undefined}))).hash) {
				if (noBlobStorage && data.length < this.nonBlobStorageLimit) {
					await (await this.getDatabaseRef(url)).set({
						data: this.potassiumService.toBase64(data),
						hash,
						timestamp: ServerValue.TIMESTAMP
					}).then();
				}
				else {
					await (await this.getStorageRef(url, hash)).put(new Blob([data])).then();
					await (await this.getDatabaseRef(url)).set({
						hash,
						timestamp: ServerValue.TIMESTAMP
					}).then();
				}

				this.cacheSet(url, data, hash);
			}

			return {hash, url};
		});
	}

	/** @inheritDoc */
	public async unregister (username: string, password: string) : Promise<void> {
		await this.ngZone.runOutsideAngular(async () => {
			await this.login(username, password);

			const {currentUser}	= await (await this.app).auth();
			if (currentUser) {
				await currentUser.delete().then();
			}
		});
	}

	/** @inheritDoc */
	public async unregisterPushNotifications (urlPromise: MaybePromise<string>) : Promise<void> {
		const url	= await urlPromise;

		await this.ngZone.runOutsideAngular(async () => {
			const messagingToken	= await this.localStorageService.getItem(
				'FirebaseDatabaseService.messagingToken',
				StringProto
			).catch(() =>
				undefined
			);

			if (!messagingToken) {
				return;
			}

			await (await this.getDatabaseRef(url)).child(messagingToken).remove().then();
		});
	}

	/** @inheritDoc */
	public uploadItem<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		noBlobStorage: boolean = false
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const cancel	= resolvable();
		const progress	= new BehaviorSubject(0);

		const result	= this.ngZone.runOutsideAngular(async () => {
			if (noBlobStorage) {
				const setItemResult	= await this.setItem(urlPromise, proto, value, true);
				this.ngZone.run(() => {
					progress.next(100);
					progress.complete();
				});
				return setItemResult;
			}

			const url	= await urlPromise;

			const data	= await serialize(proto, value);
			const hash	= this.potassiumService.toHex(
				await this.potassiumService.hash.hash(data)
			);

			/* tslint:disable-next-line:possible-timing-attack */
			if (hash === (await this.getMetadata(url).catch(() => ({hash: undefined}))).hash) {
				this.ngZone.run(() => {
					progress.next(100);
					progress.complete();
				});
				return {hash, url};
			}

			return new Promise<{hash: string; url: string}>(async (resolve, reject) => {
				const uploadTask	= (await this.getStorageRef(url, hash)).put(new Blob([data]));

				cancel.promise.then(() => {
					reject('Upload canceled.');
					uploadTask.cancel();
				});

				uploadTask.on(
					'state_changed',
					o => {
						if (o) {
							const snapshot	= o;
							this.ngZone.run(() => {
								progress.next(
									snapshot.bytesTransferred / snapshot.totalBytes * 100
								);
							});
						}
					},
					reject,
					() => {
						(async () => {
							try {
								await (await this.getDatabaseRef(url)).set({
									hash,
									timestamp: ServerValue.TIMESTAMP
								}).then();
								this.cacheSet(url, data, hash);
								this.ngZone.run(() => {
									progress.next(100);
									progress.complete();
								});
								resolve({hash, url});
							}
							catch (err) {
								reject(err);
							}
						})();

						return undefined;
					}
				);
			});
		});

		return {cancel: cancel.resolve, progress, result};
	}

	/** @inheritDoc */
	public async waitForUnlock (urlPromise: MaybePromise<string>) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		return this.ngZone.runOutsideAngular(async () => new Promise<{
			reason: string|undefined;
			wasLocked: boolean;
		}>(async resolve => {
			const url	= await urlPromise;

			let reason: string|undefined;
			let wasLocked	= false;

			(await (await this.getDatabaseRef(url))).on('value', async snapshot => {
				const value: {
					[key: string]: {id?: string; reason?: string; timestamp?: number};
				}	=
					(snapshot && snapshot.val()) || {}
				;

				const keys	= Object.keys(value).sort();

				if (keys.length > 0) {
					reason		= value[keys[0]].reason;
					reason		= typeof reason === 'string' ? reason : undefined;
					wasLocked	= true;
					return;
				}

				resolve({reason, wasLocked});
			});
		}));
	}

	/** @inheritDoc */
	public watch<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>
	) : Observable<ITimedValue<T>> {
		return this.ngZone.runOutsideAngular(() => new Observable<ITimedValue<T>>(observer => {
			let cleanup: Function;
			let lastValue: T|undefined;

			/* tslint:disable-next-line:no-null-keyword */
			const onValue	= async (snapshot: DataSnapshot|null) => {
				const url	= await urlPromise;

				if (!snapshot || !snapshot.exists()) {
					const timestamp	= await getTimestamp();
					this.ngZone.run(() => {
						observer.next({timestamp, value: proto.create()});
					});
				}
				else {
					const result	= await (await this.downloadItem(url, proto)).result;

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
						this.ngZone.run(() => { observer.next(result); });
					}

					lastValue		= result.value;
				}
			};

			(async () => {
				const url	= await urlPromise;

				const ref	= await this.getDatabaseRef(url);
				ref.on('value', onValue);
				cleanup	= () => { ref.off('value', onValue); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		}));
	}

	/** @inheritDoc */
	public watchExists (urlPromise: MaybePromise<string>) : Observable<boolean> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchExists,
			urlPromise,
			() => this.ngZone.runOutsideAngular(() => new Observable<boolean>(observer => {
				let cleanup: Function;

				/* tslint:disable-next-line:no-null-keyword */
				const onValue	= (snapshot: DataSnapshot|null) => {
					this.ngZone.run(() => {
						observer.next(!!snapshot && snapshot.exists());
					});
				};

				(async () => {
					const url	= await urlPromise;

					const ref	= await this.getDatabaseRef(url);
					ref.on('value', onValue);
					cleanup	= () => { ref.off('value', onValue); };
				})();

				return async () => {
					(await waitForValue(() => cleanup))();
				};
			}))
		);
	}

	/** @inheritDoc */
	public watchList<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false
	) : Observable<ITimedValue<T>[]> {
		return this.ngZone.runOutsideAngular(() => new Observable<ITimedValue<T>[]>(observer => {
			let cleanup: Function;

			(async () => {
				const url	= await urlPromise;

				const data		= new Map<string, {hash: string; timestamp: number; value: T}>();
				const listRef	= await this.getDatabaseRef(url);
				let initiated	= false;

				const initialValues	= (await listRef.once('value')).val() || {};

				/* tslint:disable-next-line:no-null-keyword */
				const getValue		= async (snapshot: {key?: string|null; val: () => any}) => {
					if (!snapshot.key) {
						return false;
					}
					const {hash, timestamp}	=
						snapshot.val() || {hash: undefined, timestamp: undefined}
					;
					if (typeof hash !== 'string' || typeof timestamp !== 'number') {
						return false;
					}
					data.set(snapshot.key, {
						hash,
						timestamp,
						value: await this.getItem(`${url}/${snapshot.key}`, proto)
					});
					return true;
				};

				const publishList	= () => {
					this.ngZone.run(() => {
						observer.next(
							this.getListKeysInternal(data).map(k => {
								const o	= data.get(k);
								if (!o) {
									throw new Error('Corrupt Map.');
								}
								return {timestamp: o.timestamp, value: o.value};
							})
						);
					});
				};

				/* tslint:disable-next-line:no-null-keyword */
				const onChildAdded		= async (snapshot: DataSnapshot|null) : Promise<void> => {
					if (
						snapshot &&
						snapshot.key &&
						typeof (snapshot.val() || {}).hash !== 'string'
					) {
						return onChildAdded(await this.waitForValue(`${url}/${snapshot.key}`));
					}
					else if (
						!snapshot ||
						!snapshot.key ||
						data.has(snapshot.key) ||
						!(await getValue(snapshot))
					) {
						return;
					}
					publishList();
				};

				/* tslint:disable-next-line:no-null-keyword */
				const onChildChanged	= async (snapshot: DataSnapshot|null) => {
					if (
						!snapshot ||
						!snapshot.key ||
						!(await getValue(snapshot))
					) {
						return;
					}
					publishList();
				};

				/* tslint:disable-next-line:no-null-keyword */
				const onChildRemoved	= async (snapshot: DataSnapshot|null) => {
					if (!snapshot || !snapshot.key) {
						return;
					}
					data.delete(snapshot.key);
					publishList();
				};

				/* tslint:disable-next-line:no-null-keyword */
				const onValue			= async (snapshot: DataSnapshot|null) => {
					if (!initiated) {
						initiated	= true;
						return;
					}
					if (snapshot && !snapshot.exists()) {
						this.ngZone.run(() => { observer.complete(); });
					}
				};

				for (const key of Object.keys(initialValues)) {
					await getValue({key, val: () => initialValues[key]});
				}
				publishList();

				listRef.on('child_added', onChildAdded);
				listRef.on('child_changed', onChildChanged);
				listRef.on('child_removed', onChildRemoved);

				if (completeOnEmpty) {
					listRef.on('value', onValue);
				}

				cleanup	= () => {
					listRef.off('child_added', onChildAdded);
					listRef.off('child_changed', onChildChanged);
					listRef.off('child_removed', onChildRemoved);
					listRef.off('value', onValue);
				};
			})().catch(() => {
				this.ngZone.run(() => { observer.next([]); });
				cleanup	= () => {};
			});

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		}));
	}

	/** @inheritDoc */
	public watchListKeyPushes (urlPromise: MaybePromise<string>) : Observable<{
		key: string;
		previousKey?: string;
	}> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListKeyPushes,
			urlPromise,
			() => this.ngZone.runOutsideAngular(() => new Observable<{
				key: string;
				previousKey?: string;
			}>(observer => {
				let cleanup: Function;

				(async () => {
					const url	= await urlPromise;

					const listRef	= await this.getDatabaseRef(url);

					/* tslint:disable-next-line:no-null-keyword */
					const onChildAdded	= async (
						snapshot: DataSnapshot|null,
						previousKey?: string|null
					) => this.ngZone.run(async () : Promise<void> => {
						if (
							snapshot &&
							snapshot.key &&
							typeof (snapshot.val() || {}).hash !== 'string'
						) {
							return onChildAdded(
								await this.waitForValue(`${url}/${snapshot.key}`),
								previousKey
							);
						}
						else if (!snapshot || !snapshot.exists() || !snapshot.key) {
							return;
						}

						observer.next({
							key: snapshot.key,
							previousKey: previousKey || undefined
						});
					});

					listRef.on('child_added', onChildAdded);
					cleanup	= () => { listRef.off('child_added', onChildAdded); };
				})().catch(() => {
					cleanup	= () => {};
				});

				return async () => {
					(await waitForValue(() => cleanup))();
				};
			}))
		);
	}

	/** @inheritDoc */
	public watchListKeys (urlPromise: MaybePromise<string>) : Observable<string[]> {
		return getOrSetDefaultObservable(
			this.observableCaches.watchListKeys,
			urlPromise,
			() => this.ngZone.runOutsideAngular(() => new Observable<string[]>(observer => {
				let cleanup: Function;

				(async () => {
					const url	= await urlPromise;

					const listRef	= await this.getDatabaseRef(url);

					let keys: string[]|undefined;

					/* tslint:disable-next-line:no-null-keyword */
					const onValue	= (snapshot: DataSnapshot|null) => {
						if (!snapshot) {
							keys	= undefined;
							this.ngZone.run(() => { observer.next([]); });
							return;
						}

						const val: any	= snapshot.val() || {};
						const newKeys	= this.getListKeysInternal(val);

						for (let i = newKeys.length - 1 ; i >= 0 ; --i) {
							const o	= val[newKeys[i]];
							if (!o || typeof o.hash !== 'string') {
								return;
							}
						}

						if (keys && compareArrays(keys, newKeys)) {
							return;
						}

						keys	= Array.from(newKeys);
						this.ngZone.run(() => { observer.next(newKeys); });
					};

					listRef.on('value', onValue);
					cleanup	= () => { listRef.off('value', onValue); };
				})().catch(() => {
					this.ngZone.run(() => { observer.next([]); });
					cleanup	= () => {};
				});

				return async () => {
					(await waitForValue(() => cleanup))();
				};
			}))
		);
	}

	/** @inheritDoc */
	public watchListPushes<T> (
		urlPromise: MaybePromise<string>,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		noCache: boolean = false
	) : Observable<ITimedValue<T>&{key: string; previousKey?: string; url: string}> {
		return this.ngZone.runOutsideAngular(() =>
			new Observable<ITimedValue<T>&{
				key: string;
				previousKey?: string;
				url: string;
			}>(observer => {
				let cleanup: Function;

				(async () => {
					const url	= await urlPromise;

					const listRef	= await this.getDatabaseRef(url);
					let initiated	= false;

					/* tslint:disable-next-line:no-null-keyword */
					const onChildAdded	= async (
						snapshot: DataSnapshot|null,
						previousKey?: string|null
					) : Promise<void> => {
						if (
							snapshot &&
							snapshot.key &&
							typeof (snapshot.val() || {}).hash !== 'string'
						) {
							return onChildAdded(
								await this.waitForValue(`${url}/${snapshot.key}`),
								previousKey
							);
						}
						else if (!snapshot || !snapshot.exists() || !snapshot.key) {
							return;
						}

						const key					= snapshot.key;
						const itemUrl				= `${url}/${key}`;
						const {timestamp, value}	=
							await (await this.downloadItem(itemUrl, proto)).result
						;

						this.ngZone.run(() => {
							observer.next({
								key,
								previousKey: previousKey || undefined,
								timestamp,
								url: itemUrl,
								value
							});
						});

						if (noCache) {
							this.cacheRemove({url: itemUrl});
						}
					};

					/* tslint:disable-next-line:no-null-keyword */
					const onValue		= async (snapshot: DataSnapshot|null) => {
						if (!initiated) {
							initiated	= true;
							return;
						}
						if (snapshot && !snapshot.exists()) {
							this.ngZone.run(() => { observer.complete(); });
						}
					};

					listRef.on('child_added', onChildAdded);

					if (completeOnEmpty) {
						listRef.on('value', onValue);
					}

					cleanup	= () => {
						listRef.off('child_added', onChildAdded);
						listRef.off('value', onValue);
					};
				})().catch(() => {
					cleanup	= () => {};
				});

				return async () => {
					(await waitForValue(() => cleanup))();
				};
			})
		);
	}

	constructor (
		envService: EnvService,
		localStorageService: LocalStorageService,
		potassiumService: PotassiumService,

		/** @ignore */
		private readonly ngZone: NgZone,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super(
			envService,
			localStorageService,
			potassiumService
		);
	}
}
