/* tslint:disable:no-import-side-effect */

import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';
import {BehaviorSubject, Observable} from 'rxjs';
import {DataType} from '../data-type';
import {env} from '../env';
import {util} from '../util';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {LocalStorageService} from './local-storage.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private app: Promise<firebase.app.App>	= util.retryUntilSuccessful(() => {
		try {
			for (const key of Object.keys(localStorage).filter(k => k.startsWith('firebase:'))) {
				/* tslint:disable-next-line:ban */
				localStorage.removeItem(key);
			}
		}
		catch (_) {}

		return firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);
	});

	/** @ignore */
	private readonly localLocks: Map<string, {}>	= new Map<string, {}>();

	/** @ignore */
	private async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
	}

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@cyph.me`;
	}

	/** @inheritDoc */
	public downloadItem (url: string) : {
		progress: Observable<number>;
		result: Promise<Uint8Array>;
	} {
		const progress	= new BehaviorSubject(0);

		/* <any> is temporary workaround for https://github.com/ReactiveX/rxjs/issues/2539 */
		return {
			progress: <any> progress,
			result: (async () => {
				const hash	= await this.getHash(url);

				try {
					const localData	= await this.localStorageService.getItem(`cache/${hash}`);
					progress.next(100);
					progress.complete();
					return localData;
				}
				catch (_) {}

				const request	= util.requestByteStream({
					url: await (await this.getStorageRef(url)).getDownloadURL()
				});

				request.progress.subscribe(
					n => { progress.next(n); },
					err => { progress.next(err); }
				);

				const data	= await request.result;

				if (
					!this.potassiumService.compareMemory(
						this.potassiumService.fromBase64(hash),
						await this.potassiumService.hash.hash(data)
					)
				) {
					const err	= new Error('Invalid data hash.');
					progress.error(err);
					throw err;
				}

				progress.next(100);
				progress.complete();
				this.localStorageService.setItem(`cache/${hash}`, data).catch(() => {});
				return data;
			})()
		};
	}

	/** @inheritDoc */
	public async getDatabaseRef (url: string) : Promise<firebase.database.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(url)
		);
	}

	/** @inheritDoc */
	public async getHash (url: string) : Promise<string> {
		const hash	= (await (await this.getDatabaseRef(url)).once('value')).val();

		if (typeof hash !== 'string') {
			throw new Error(`Item at ${url} not found.`);
		}

		return hash;
	}

	/** @inheritDoc */
	public async getItem (url: string) : Promise<Uint8Array> {
		return (await this.downloadItem(url)).result;
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
		return util.lock(
			util.getOrSetDefault<string, {}>(this.localLocks, url, () => ({})),
			async () => {
				let lock: firebase.database.ThenableReference|undefined;

				const queue	= await this.getDatabaseRef(url);
				const id	= util.uuid();

				const contendForLock	= () => {
					lock	= queue.push({id, reason});
					lock.onDisconnect().remove();
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
					if (lock) {
						lock.remove();
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
		await util.retryUntilSuccessful(async () =>
			(await this.app).auth().signOut()
		);
	}

	/** @inheritDoc */
	public async pushItem (url: string, value: DataType) : Promise<{hash: string; url: string}> {
		return this.setItem(`${url}/${(await this.getDatabaseRef(url)).push().key}`, value);
	}

	/** @inheritDoc */
	public async register (username: string, password: string) : Promise<void> {
		await (await this.app).auth().createUserWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	/** @inheritDoc */
	public async removeItem (url: string) : Promise<void> {
		await Promise.all([
			(await this.getDatabaseRef(url)).remove().then(),
			(await this.getStorageRef(url)).delete().then()
		]);
	}

	/** @inheritDoc */
	public async setItem (url: string, value: DataType) : Promise<{hash: string; url: string}> {
		const data	= await util.toBytes(value);
		const hash	= this.potassiumService.toBase64(await this.potassiumService.hash.hash(data));

		/* tslint:disable-next-line:possible-timing-attack */
		if (hash !== (await this.getHash(url).catch(() => undefined))) {
			this.localStorageService.setItem(`cache/${hash}`, data).catch(() => {});
			await (await this.getStorageRef(url)).put(new Blob([data])).then();
			await (await this.getDatabaseRef(url)).set(hash).then();
		}

		return {hash, url};
	}

	/** @inheritDoc */
	public async timestamp () : Promise<any> {
		return firebase.database.ServerValue.TIMESTAMP;
	}

	/** @inheritDoc */
	public uploadItem (url: string, value: DataType) : {
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
			const data	= await util.toBytes(value);
			const hash	= this.potassiumService.toBase64(
				await this.potassiumService.hash.hash(data)
			);

			/* tslint:disable-next-line:possible-timing-attack */
			if (hash === (await this.getHash(url).catch(() => undefined))) {
				progress.next(100);
				progress.complete();
				return {hash, url};
			}

			this.localStorageService.setItem(`cache/${hash}`, data).catch(() => {});

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
					async () => {
						try {
							await (await this.getDatabaseRef(url)).set(hash).then();
							progress.next(100);
							progress.complete();
							resolve({hash, url});
						}
						catch (err) {
							reject(err);
						}
					}
				);
			});
		})();

		/* <any> is temporary workaround for https://github.com/ReactiveX/rxjs/issues/2539 */
		return {cancel, progress: <any> progress, result};
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
	public watchList<T = Uint8Array> (
		url: string,
		mapper: (value: Uint8Array) => T|Promise<T> = (value: Uint8Array&T) => value
	) : Observable<T[]> {
		return new Observable<T[]>(observer => {
			let cleanup: Function;

			(async () => {
				const data			= new Map<string, {hash: string; value: T}>();
				const listRef		= await this.getDatabaseRef(url);

				let initRemaining	=
					(<firebase.database.DataSnapshot> await listRef.once('value')).numChildren()
				;

				const getValue		= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot.key) {
						return false;
					}
					const hash	= snapshot.val();
					if (typeof hash !== 'string') {
						return false;
					}
					data.set(snapshot.key, {
						hash,
						value: await mapper(await this.getItem(`${url}/${snapshot.key}`))
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
							return o.value;
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
					if (initRemaining !== 0) {
						--initRemaining;
						if (initRemaining !== 0) {
							return;
						}
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
					if (initRemaining !== 0) {
						return;
					}
					publishList();
				};

				const onChildRemoved	= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot || !snapshot.key) {
						return;
					}
					data.delete(snapshot.key);
					if (initRemaining !== 0) {
						return;
					}
					publishList();
				};

				listRef.on('child_added', onChildAdded);
				listRef.on('child_changed', onChildChanged);
				listRef.on('child_removed', onChildRemoved);

				cleanup	= () => {
					listRef.on('child_added', onChildAdded);
					listRef.on('child_changed', onChildChanged);
					listRef.on('child_removed', onChildRemoved);
				};
			})();

			return async () => {
				(await util.waitForValue(() => cleanup))();
			};
		});
	}

	/** @inheritDoc */
	public watchMaybe (url: string) : Observable<Uint8Array|undefined> {
		return new Observable<Uint8Array|undefined>(observer => {
			let cleanup: Function;

			const onValue	= async (snapshot: firebase.database.DataSnapshot) => {
				if (!snapshot || !snapshot.exists()) {
					observer.next();
				}
				observer.next(await this.getItem(url));
			};

			(async () => {
				const ref	= await this.getDatabaseRef(url);
				ref.on('value', onValue);
				cleanup	= () => { ref.off('value', onValue); };
			})();

			return async () => {
				(await util.waitForValue(() => cleanup))();
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
