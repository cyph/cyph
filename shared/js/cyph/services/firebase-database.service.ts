/* tslint:disable:max-file-line-count no-import-side-effect */

import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {skip} from 'rxjs/operators/skip';
import {env} from '../env';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {BinaryProto} from '../protos';
import {
	deserialize,
	getTimestamp,
	getOrSetDefault,
	lock,
	requestByteStream,
	retryUntilSuccessful,
	serialize,
	uuid,
	waitForValue
} from '../util';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {LocalStorageService} from './local-storage.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private app: Promise<firebase.app.App>	= retryUntilSuccessful(() => {
		try {
			for (const key of Object.keys(localStorage).filter(k => k.startsWith('firebase:'))) {
				/* tslint:disable-next-line:ban */
				localStorage.removeItem(key);
			}
		}
		catch (_) {}

		return firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);
	});

	/** Mapping of URLS to last known good hashes. */
	private readonly hashCache: Map<string, string>	= new Map<string, string>();

	/** @ignore */
	private readonly localLocks: Map<string, {}>	= new Map<string, {}>();

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
	private async getDatabaseRef (url: string) : Promise<firebase.database.Reference> {
		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(url)
		);
	}

	/** @ignore */
	private async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
	}

	/** @ignore */
	private recursivelyGetKeys (root: string, o: any) : string[] {
		return (root ? [root] : []).concat(
			typeof o === 'object' ?
				[] :
				Object.keys(o).
					map(k => this.recursivelyGetKeys(`${root}/${k}`, o[k])).
					reduce((a, b) => a.concat(b), [])
		);
	}

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@cyph.me`;
	}

	/** @inheritDoc */
	public async checkDisconnected (url: string) : Promise<boolean> {
		return (await (await this.getDatabaseRef(url)).once('value')).val() !== undefined;
	}

	/** @inheritDoc */
	public connectionStatus () : Observable<boolean> {
		return new Observable<boolean>(observer => {
			let cleanup: Function;

			(async () => {
				const connectedRef	= await this.getDatabaseRef('.info/connected');

				const onValue		= async (snapshot: firebase.database.DataSnapshot) => {
					if (snapshot) {
						observer.next(snapshot.val() === true);
					}
				};

				connectedRef.on('value', onValue);
				cleanup	= () => { connectedRef.off('value', onValue); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public downloadItem<T> (url: string, proto: IProto<T>) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress	= new BehaviorSubject(0);

		return {
			progress,
			result: retryUntilSuccessful(
				async () => {
					const {hash, timestamp}	= await this.getMetadata(url);

					try {
						const localData	= await this.cacheGet({hash});
						progress.next(100);
						progress.complete();
						return {timestamp, value: await deserialize(proto, localData)};
					}
					catch (_) {}

					progress.next(0);

					const request	= requestByteStream({
						retries: 3,
						url: await (await this.getStorageRef(url)).getDownloadURL()
					});

					request.progress.subscribe(
						n => { progress.next(n); },
						err => { progress.next(err); }
					);

					const value	= await request.result;

					if (
						!this.potassiumService.compareMemory(
							this.potassiumService.fromBase64(hash),
							await this.potassiumService.hash.hash(value)
						)
					) {
						const err	= new Error('Invalid data hash.');
						progress.error(err);
						throw err;
					}

					progress.next(100);
					progress.complete();
					this.cacheSet(url, value, hash);
					return {timestamp, value: await deserialize(proto, value)};
				},
				25
			)
		};
	}

	/** @inheritDoc */
	public async getList<T> (url: string, proto: IProto<T>) : Promise<T[]> {
		const value	= (await (await this.getDatabaseRef(url)).once('value')).val();
		return !value ?
			[] :
			Promise.all(Object.keys(value).map(async k => this.getItem(`${url}/${k}`, proto)))
		;
	}

	/** @inheritDoc */
	public async getListKeys (url: string) : Promise<string[]> {
		const value	= (await (await this.getDatabaseRef(url)).once('value')).val();
		return !value ?
			[] :
			Object.keys(value)
		;
	}

	/** @inheritDoc */
	public async getMetadata (url: string) : Promise<{hash: string; timestamp: number}> {
		const {hash, timestamp}	=
			(await (await this.getDatabaseRef(url)).once('value')).val() ||
			{hash: undefined, timestamp: undefined}
		;

		if (typeof hash !== 'string' || typeof timestamp !== 'number') {
			throw new Error(`Item at ${url} not found.`);
		}

		return {hash, timestamp};
	}

	/** @inheritDoc */
	public async hasItem (url: string) : Promise<boolean> {
		try {
			await (await this.getStorageRef(url)).getDownloadURL();
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/** @inheritDoc */
	public async lock<T> (
		url: string,
		f: (reason?: string) => Promise<T>,
		reason?: string
	) : Promise<T> {
		return lock(
			getOrSetDefault<string, {}>(this.localLocks, url, () => ({})),
			async () => {
				let mutex: firebase.database.ThenableReference|undefined;

				const queue	= await this.getDatabaseRef(url);
				const id	= uuid();

				const contendForLock	= () => {
					mutex	= queue.push(reason ? {id, reason} : {id});
					mutex.onDisconnect().remove();
				};

				try {
					let lastReason: string|undefined;

					contendForLock();

					await new Promise<void>(resolve => {
						queue.on('value', async snapshot => {
							const value: {[key: string]: {id: string; reason?: string}}	=
								(snapshot && snapshot.val()) || {}
							;

							const keys	= Object.keys(value).sort();
							const o		= value[keys[0]] || {};

							if (o.id === id) {
								resolve();
								queue.off();
								return;
							}

							lastReason	= o.reason;

							if (!keys.find(key => value[key].id === id)) {
								contendForLock();
							}
						});
					});

					return await f(lastReason);
				}
				finally {
					if (mutex) {
						mutex.remove();
					}
				}
			},
			reason
		);
	}

	/** @inheritDoc */
	public async lockStatus (url: string) : Promise<{locked: boolean; reason: string|undefined}> {
		const value: {[key: string]: {id: string; reason?: string}}	=
			(await (await this.getDatabaseRef(url)).once('value')).val() || {}
		;

		const keys	= Object.keys(value).sort();

		return {
			locked: keys.length > 0,
			reason: (value[keys[0]] || {}).reason
		};
	}

	/** @inheritDoc */
	public async login (username: string, password: string) : Promise<void> {
		await (await this.app).auth().signInWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	/** @inheritDoc */
	public async logout () : Promise<void> {
		await retryUntilSuccessful(async () =>
			(await this.app).auth().signOut()
		);
	}

	/** @inheritDoc */
	public async pushItem<T> (url: string, proto: IProto<T>, value: T) : Promise<{
		hash: string;
		url: string;
	}> {
		return this.lock(`pushlocks/${url}`, async () =>
			this.setItem(`${url}/${(await this.getDatabaseRef(url)).push().key}`, proto, value)
		);
	}

	/** @inheritDoc */
	public async register (username: string, password: string) : Promise<void> {
		await (await this.app).auth().createUserWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);

		await this.login(username, password);
	}

	/** @inheritDoc */
	public async removeItem (url: string) : Promise<void> {
		this.cacheRemove({url});

		const databaseRef	= await this.getDatabaseRef(url);

		await Promise.all(
			this.recursivelyGetKeys(url, (await databaseRef.once('value')).val()).map(
				async k => (await this.getStorageRef(k)).delete().then()
			).concat(
				(async () => databaseRef.remove().then())()
			)
		).catch(
			() => {}
		);
	}

	/** @inheritDoc */
	public async setConnectTracker (
		url: string,
		onReconnect?: () => void
	) : Promise<() => void> {
		const ref			= await this.getDatabaseRef(url);
		const onDisconnect	= ref.onDisconnect();

		ref.set(firebase.database.ServerValue.TIMESTAMP);
		onDisconnect.remove();

		this.connectionStatus().pipe(skip(1)).subscribe(isConnected => {
			if (!isConnected) {
				return;
			}
			ref.set(firebase.database.ServerValue.TIMESTAMP);
			if (onReconnect) {
				onReconnect();
			}
		});

		return () => {
			ref.remove();
			onDisconnect.cancel();
		};
	}

	/** @inheritDoc */
	public async setDisconnectTracker (
		url: string,
		onReconnect?: () => void
	) : Promise<() => void> {
		const ref			= await this.getDatabaseRef(url);
		const onDisconnect	= ref.onDisconnect();

		ref.remove();
		onDisconnect.set(firebase.database.ServerValue.TIMESTAMP);

		this.connectionStatus().pipe(skip(1)).subscribe(isConnected => {
			if (!isConnected) {
				return;
			}
			ref.remove();
			if (onReconnect) {
				onReconnect();
			}
		});

		return () => {
			ref.set(firebase.database.ServerValue.TIMESTAMP);
			onDisconnect.cancel();
		};
	}

	/** @inheritDoc */
	public async setItem<T> (url: string, proto: IProto<T>, value: T) : Promise<{
		hash: string;
		url: string;
	}> {
		const data	= await serialize(proto, value);
		const hash	= this.potassiumService.toBase64(await this.potassiumService.hash.hash(data));

		/* tslint:disable-next-line:possible-timing-attack */
		if (hash !== (await this.getMetadata(url).catch(() => ({hash: undefined}))).hash) {
			await (await this.getStorageRef(url)).put(new Blob([data])).then();
			await (await this.getDatabaseRef(url)).set({
				hash,
				timestamp: firebase.database.ServerValue.TIMESTAMP
			}).then();
			this.cacheSet(url, data, hash);
		}

		return {hash, url};
	}

	/** @inheritDoc */
	public uploadItem<T> (url: string, proto: IProto<T>, value: T) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		let cancel	= () => {};
		const cancelPromise	= new Promise<void>(resolve => {
			cancel	= resolve;
		});

		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const data	= await serialize(proto, value);
			const hash	= this.potassiumService.toBase64(
				await this.potassiumService.hash.hash(data)
			);

			/* tslint:disable-next-line:possible-timing-attack */
			if (hash === (await this.getMetadata(url).catch(() => ({hash: undefined}))).hash) {
				progress.next(100);
				progress.complete();
				return {hash, url};
			}

			return new Promise<{hash: string; url: string}>(async (resolve, reject) => {
				const uploadTask	= (await this.getStorageRef(url)).put(new Blob([data]));

				cancelPromise.then(() => {
					reject('Upload canceled.');
					uploadTask.cancel();
				});

				uploadTask.on(
					'state_changed',
					(snapshot: firebase.storage.UploadTaskSnapshot) => {
						progress.next(snapshot.bytesTransferred / snapshot.totalBytes * 100);
					},
					reject,
					() => {
						(async () => {
							try {
								await (await this.getDatabaseRef(url)).set({
									hash,
									timestamp: firebase.database.ServerValue.TIMESTAMP
								}).then();
								this.cacheSet(url, data, hash);
								progress.next(100);
								progress.complete();
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
		})();

		return {cancel, progress, result};
	}

	/** @inheritDoc */
	public async waitForUnlock (url: string) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		return new Promise<{reason: string|undefined; wasLocked: boolean}>(async resolve => {
			let reason: string|undefined;
			let wasLocked	= false;

			(await (await this.getDatabaseRef(url))).on('value', async snapshot => {
				const value: {[key: string]: {id: string; reason?: string}}	=
					(snapshot && snapshot.val()) || {}
				;

				const keys	= Object.keys(value).sort();

				if (keys.length > 0) {
					reason		= value[keys[0]].reason;
					wasLocked	= true;
					return;
				}

				resolve({reason, wasLocked});
			});
		});
	}

	/** @inheritDoc */
	public watch<T> (url: string, proto: IProto<T>) : Observable<ITimedValue<T>> {
		return new Observable<ITimedValue<T>>(observer => {
			let cleanup: Function;

			const onValue	= async (snapshot: firebase.database.DataSnapshot) => {
				if (!snapshot || !snapshot.exists()) {
					observer.next({
						timestamp: await getTimestamp(),
						value: proto.create()
					});
				}
				else {
					observer.next(await (await this.downloadItem(url, proto)).result);
				}
			};

			(async () => {
				const ref	= await this.getDatabaseRef(url);
				ref.on('value', onValue);
				cleanup	= () => { ref.off('value', onValue); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public watchList<T> (
		url: string,
		proto: IProto<T>,
		completeOnEmpty: boolean = false
	) : Observable<ITimedValue<T>[]> {
		return new Observable<ITimedValue<T>[]>(observer => {
			let cleanup: Function;

			(async () => {
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
					observer.next(
						Array.from(data.keys()).sort().map(k => {
							const o	= data.get(k);
							if (!o) {
								throw new Error('Corrupt Map.');
							}
							return {timestamp: o.timestamp, value: o.value};
						})
					);
				};

				const onChildAdded	= async (snapshot: firebase.database.DataSnapshot) => {
					if (
						!snapshot ||
						!snapshot.key ||
						data.has(snapshot.key) ||
						!(await getValue(snapshot))
					) {
						return;
					}
					publishList();
				};

				const onChildChanged	= async (snapshot: firebase.database.DataSnapshot) => {
					if (
						!snapshot ||
						!snapshot.key ||
						!(await getValue(snapshot))
					) {
						return;
					}
					publishList();
				};

				const onChildRemoved	= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot || !snapshot.key) {
						return;
					}
					data.delete(snapshot.key);
					publishList();
				};

				const onValue			= async (snapshot: firebase.database.DataSnapshot) => {
					if (!initiated) {
						initiated	= true;
						return;
					}
					if (snapshot && !snapshot.exists()) {
						observer.complete();
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
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public watchListKeyPushes (url: string) : Observable<string> {
		return new Observable<string>(observer => {
			let cleanup: Function;

			(async () => {
				const listRef	= await this.getDatabaseRef(url);

				const onChildAdded	= (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot || !snapshot.exists() || !snapshot.key) {
						return;
					}

					observer.next(snapshot.key);
				};

				listRef.on('child_added', onChildAdded);
				cleanup	= () => { listRef.off('child_added', onChildAdded); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public watchListKeys (url: string) : Observable<string[]> {
		return new Observable<string[]>(observer => {
			let cleanup: Function;

			(async () => {
				const listRef	= await this.getDatabaseRef(url);

				const onValue	= (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot || !snapshot.exists()) {
						return;
					}

					observer.next(Object.keys(snapshot.val() || {}));
				};

				listRef.on('value', onValue);
				cleanup	= () => { listRef.off('value', onValue); };
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public watchListPushes<T> (
		url: string,
		proto: IProto<T>,
		completeOnEmpty: boolean = false,
		noCache: boolean = false
	) : Observable<ITimedValue<T>&{url: string}> {
		return new Observable<ITimedValue<T>&{url: string}>(observer => {
			let cleanup: Function;

			(async () => {
				const listRef	= await this.getDatabaseRef(url);
				let initiated	= false;

				const onChildAdded	= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot || !snapshot.key) {
						return;
					}

					const itemUrl				= `${url}/${snapshot.key}`;
					const {timestamp, value}	=
						await (await this.downloadItem(itemUrl, proto)).result
					;

					observer.next({timestamp, url: itemUrl, value});

					if (noCache) {
						this.cacheRemove({url: itemUrl});
					}
				};

				const onValue			= async (snapshot: firebase.database.DataSnapshot) => {
					if (!initiated) {
						initiated	= true;
						return;
					}
					if (snapshot && !snapshot.exists()) {
						observer.complete();
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
			})();

			return async () => {
				(await waitForValue(() => cleanup))();
			};
		});
	}

	constructor (
		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
