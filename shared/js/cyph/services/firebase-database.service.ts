/* tslint:disable:no-import-side-effect */

import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';
import {Observable} from 'rxjs';
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
	private readonly localLock: {}	= {};

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@cyph.me`;
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
	public async getItem (url: string) : Promise<Uint8Array> {
		const hash	= (await (await this.getDatabaseRef(url)).once('value').then()).val();
		if (typeof hash !== 'string') {
			throw new Error(`Item at ${url} not found.`);
		}

		try {
			return await this.localStorageService.getItem(`cache/${hash}`);
		}
		catch (_) {}

		const data	= await util.requestBytes({
			url: await (await this.getStorageRef(url)).getDownloadURL()
		});
		this.localStorageService.setItem(`cache/${hash}`, data).catch(() => {});
		return data;
	}

	/** @inheritDoc */
	public async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
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
			this.localLock,
			async () => {
				const queue	= await this.getDatabaseRef(url);
				const id	= util.uuid();
				const lock	= queue.push({id, reason});

				lock.onDisconnect().remove();

				try {
					const lastReason	= await new Promise<string|undefined>(resolve => {
						queue.on('value', async snapshot => {
							const value: {id: string; reason?: string}[]	=
								(snapshot && snapshot.val()) || []
							;

							if (!value[0] || value[0].id !== id) {
								return;
							}

							resolve(value[0].reason);
							queue.off();
						});
					});

					return await f(lastReason);
				}
				finally {
					lock.remove();
				}
			},
			reason
		);
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
	public async pushItem (url: string, value: DataType) : Promise<string> {
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
	public async setItem (url: string, value: DataType) : Promise<string> {
		const data	= await util.toBytes(value);
		const hash	= this.potassiumService.toBase64(await this.potassiumService.hash.hash(data));

		this.localStorageService.setItem(`cache/${hash}`, data).catch(() => {});
		await (await this.getStorageRef(url)).put(new Blob([data])).then();
		await (await this.getDatabaseRef(url)).set(hash).then();

		return url;
	}

	/** @inheritDoc */
	public async timestamp () : Promise<any> {
		return firebase.database.ServerValue.TIMESTAMP;
	}

	/** @inheritDoc */
	public watchItem (url: string) : Observable<Uint8Array|undefined> {
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

				cleanup	= () => {
					ref.off('value', onValue);
				};
			})();

			return async () => {
				(await util.waitForValue(() => cleanup))();
			};
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
				const listRef		= await this.getDatabaseRef(url);

				let initRemaining	=
					(<firebase.database.DataSnapshot> await listRef.once('value')).numChildren()
				;

				const data			= new Map<string, {hash: string; value: T}>();

				const getValue		= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot.key) {
						return false;
					}
					const hash	= snapshot.val();
					if (typeof hash !== 'string') {
						return false;
					}
					data.set(
						snapshot.key,
						{
							hash,
							value: await mapper(await this.getItem(`${url}/${snapshot.key}`))
						}
					);
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

	constructor (
		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
