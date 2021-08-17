import {Injectable, NgZone} from '@angular/core';
import {Dexie} from 'dexie';
import * as localforage from 'localforage';
import {extendPrototype as localforageGetItemsInit} from 'localforage-getitems';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {env} from '../env';
import {IResolvable} from '../iresolvable';
import {lockFunction} from '../util/lock';
import {debugLogError} from '../util/log';
import {resolvable} from '../util/wait/resolvable';
import {sleep} from '../util/wait/sleep';

import {LocalStorageService} from './local-storage.service';

localforageGetItemsInit(localforage);

/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly batchInterval = 250;

	/** @ignore */
	private readonly batchQueues = {
		getItem: <
			{key: string; result: IResolvable<Uint8Array | undefined>}[]
		> [],
		removeItem: <{key: string; result: IResolvable<void>}[]> [],
		setItem: <
			{key: string; result: IResolvable<void>; value: Uint8Array}[]
		> []
	};

	/** @ignore */
	private readonly datastores = {
		dexie: this.ngZone.runOutsideAngular(() => {
			const dexie = new Dexie('WebLocalStorageService');
			dexie.version(1).stores({data: 'key'});
			return dexie.table<{key: string; value: Uint8Array}>('data');
		}),
		rocksDB: this.ngZone.runOutsideAngular(() => {
			const level =
				env.isCordovaDesktop &&
				typeof cordovaRequire === 'function' &&
				typeof cordovaRocksDB === 'boolean' &&
				cordovaRocksDB ?
					cordovaRequire('levelup')(
						cordovaRequire('rocksdb')('./data.db')
					) :
					undefined;

			if (!level) {
				return;
			}

			const collection = {
				keys: async () => {
					const stream = level.createKeyStream();
					const keys: string[] = [];
					const result = resolvable(keys);

					stream.on('data', (key: string) => {
						keys.push(key);
					});
					stream.on('end', () => {
						result.resolve();
					});
					stream.on('error', (err: any) => {
						result.reject(err);
					});

					return result;
				}
			};

			return {
				bulkGet: async (
					keys: string[]
				) : Promise<{value?: Uint8Array}[]> =>
					Promise.all(
						keys.map(async key => ({value: await level.get(key)}))
					),
				bulkDelete: async (keys: string[]) : Promise<void> =>
					level.batch(keys.map(key => ({key, type: 'del'}))),
				bulkPut: async (
					items: {key: string; value: Uint8Array}[]
				) : Promise<void> =>
					level.batch(items.map(item => ({...item, type: 'put'}))),
				clear: async () : Promise<void> => level.clear(),
				optimizedGet: async (
					key: string
				) : Promise<Uint8Array | undefined> => level.get(key),
				toCollection: () => collection
			};
		})
	};

	/** @ignore */
	private readonly db = this.datastores.rocksDB || this.datastores.dexie;

	/** @ignore */
	private readonly locks = {
		getItem: lockFunction(),
		removeItem: lockFunction(),
		setItem: lockFunction()
	};

	/** @ignore */
	private readonly nativeKeystore = (async () => {
		if (!env.isCordovaMobile) {
			return undefined;
		}

		const secureStorage = await new Promise<any>((resolve, reject) => {
			const ss = new (<any> self).cordova.plugins.SecureStorage(
				() => {
					resolve(ss);
				},
				() => {
					reject();
				},
				env.appName
			);
		});

		return {
			clear: async () =>
				new Promise<void>((resolve, reject) => {
					secureStorage.clear(
						() => {
							resolve();
						},
						(err: any) => {
							reject(err);
						}
					);
				}),
			getItem: async (key: string) => {
				const value = await new Promise<any>((resolve, reject) => {
					secureStorage.get(
						(s: any) => {
							resolve(s);
						},
						(err: any) => {
							reject(err);
						},
						key
					);
				});

				if (typeof value !== 'string' || value.length < 1) {
					throw new Error('Not found.');
				}

				return potassiumUtil.fromBase64(value);
			},
			keys: async () : Promise<string[]> => {
				const keys = await new Promise<any>((resolve, reject) => {
					secureStorage.keys(
						(arr: any) => {
							resolve(arr);
						},
						(err: any) => {
							reject(err);
						}
					);
				});

				return keys instanceof Array && typeof keys[0] === 'string' ?
					keys :
					[];
			},
			removeItem: async (key: string) =>
				new Promise<void>((resolve, reject) => {
					secureStorage.remove(
						() => {
							resolve();
						},
						(err: any) => {
							reject(err);
						},
						key
					);
				}),
			setItem: async (key: string, value: Uint8Array) =>
				new Promise<void>((resolve, reject) => {
					secureStorage.set(
						() => {
							resolve();
						},
						(err: any) => {
							reject(err);
						},
						key,
						potassiumUtil.toBase64(value)
					);
				})
		};
	})().catch(() => undefined);

	/** @ignore */
	private readonly ready: Promise<void> = this.ngZone.runOutsideAngular(
		async () => {
			const migrationComplete = {
				key: 'migration-complete',
				value: new Uint8Array(0)
			};

			if ((await this.db.bulkGet([migrationComplete.key]))[0]?.value) {
				return;
			}

			/* Migration of local data from localforage to Dexie/RocksDB */

			try {
				await localforage.ready();

				const oldData = Object.entries(await localforage.getItems());

				if (oldData.length > 0) {
					await this.db.bulkPut(
						oldData
							.map(([key, value]) => ({key, value}))
							.concat(migrationComplete)
					);
					await localforage.clear();
					return;
				}
			}
			catch (err) {
				debugLogError(() => ({localforageToDexieMigrationError: err}));
			}

			/* Migration of local data from Dexie to RocksDB */

			if (!this.datastores.rocksDB) {
				await this.datastores.dexie.put(migrationComplete);
				return;
			}

			try {
				const oldData = await this.datastores.dexie.toArray();

				if (oldData.length > 0) {
					await this.datastores.rocksDB.bulkPut(
						oldData.concat(migrationComplete)
					);
					await this.datastores.dexie.clear();
				}
				else {
					await this.datastores.rocksDB.bulkPut([migrationComplete]);
				}
			}
			catch (err) {
				debugLogError(() => ({dexieToRocksDBMigrationError: err}));
			}
		}
	);

	/** @inheritDoc */
	protected async clearInternal (waitForReady: boolean) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await Promise.all([
			this.ngZone.runOutsideAngular(async () => this.db.clear()),
			this.nativeKeystore
				.then(async keystore => keystore?.clear())
				.catch(() => {})
		]);
	}

	/** @inheritDoc */
	protected async getItemInternal (
		url: string,
		waitForReady: boolean,
		getFromKeystore: boolean
	) : Promise<Uint8Array> {
		if (waitForReady) {
			await this.ready;
		}

		const [webStorageValue, keystoreValue] = await Promise.all([
			(async () => {
				if ('optimizedGet' in this.db) {
					return this.db.optimizedGet(url).catch(() => undefined);
				}

				const result = resolvable<Uint8Array | undefined>();
				this.batchQueues.getItem.push({key: url, result});

				this.locks
					.getItem(async () => {
						if (this.batchQueues.getItem.length < 1) {
							return;
						}

						await sleep(this.batchInterval);

						const queue = this.batchQueues.getItem.splice(
							0,
							this.batchQueues.getItem.length
						);

						try {
							const results = await this.ngZone.runOutsideAngular(
								async () =>
									this.db.bulkGet(queue.map(o => o.key))
							);

							for (let i = 0; i < queue.length; ++i) {
								queue[i].result.resolve(results[i]?.value);
							}
						}
						catch (err) {
							for (const {result} of queue) {
								result.reject(err);
							}
						}
					})
					.catch(() => {});

				return result;
			})(),
			getFromKeystore ?
				this.nativeKeystore
					.then(async keystore => keystore?.getItem(url))
					.catch(() => undefined) :
				undefined
		]);

		const value =
			webStorageValue instanceof Uint8Array ?
				webStorageValue :
				keystoreValue;

		/*
			Android keystore can get wiped in certain conditions,
			so having redundancy increases reliability.
		*/
		if (
			getFromKeystore &&
			value instanceof Uint8Array &&
			(!(webStorageValue instanceof Uint8Array) ||
				!(keystoreValue instanceof Uint8Array))
		) {
			await this.setItemInternal(url, value, waitForReady, true);
		}

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return value;
	}

	/** @inheritDoc */
	protected async getKeysInternal (
		waitForReady: boolean
	) : Promise<string[]> {
		if (waitForReady) {
			await this.ready;
		}

		return <any> (
			this.ngZone.runOutsideAngular(async () =>
				this.db.toCollection().keys()
			)
		);
	}

	/** @inheritDoc */
	protected async removeItemInternal (
		url: string,
		waitForReady: boolean
	) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await Promise.all([
			(async () => {
				const result = resolvable();
				this.batchQueues.removeItem.push({key: url, result});

				this.locks
					.removeItem(async () => {
						if (this.batchQueues.removeItem.length < 1) {
							return;
						}

						await sleep(this.batchInterval);

						const queue = this.batchQueues.removeItem.splice(
							0,
							this.batchQueues.removeItem.length
						);

						try {
							await this.ngZone.runOutsideAngular(async () =>
								this.db.bulkDelete(queue.map(o => o.key))
							);

							for (const {result} of queue) {
								result.resolve();
							}
						}
						catch (err) {
							for (const {result} of queue) {
								result.reject(err);
							}
						}
					})
					.catch(() => {});

				return result;
			})(),
			this.nativeKeystore
				.then(async keystore => keystore?.removeItem(url))
				.catch(() => {})
		]);
	}

	/** @inheritDoc */
	protected async setItemInternal (
		url: string,
		value: Uint8Array,
		waitForReady: boolean,
		saveToKeystore: boolean
	) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await Promise.all([
			(async () => {
				const result = resolvable();
				this.batchQueues.setItem.push({key: url, result, value});

				this.locks
					.setItem(async () => {
						if (this.batchQueues.setItem.length < 1) {
							return;
						}

						await sleep(this.batchInterval);

						const queue = this.batchQueues.setItem.splice(
							0,
							this.batchQueues.setItem.length
						);

						try {
							await this.ngZone.runOutsideAngular(async () =>
								this.db.bulkPut(
									queue.map(o => ({
										key: o.key,
										value: o.value
									}))
								)
							);

							for (const {result} of queue) {
								result.resolve();
							}
						}
						catch (err) {
							for (const {result} of queue) {
								result.reject(err);
							}
						}
					})
					.catch(() => {});

				return result;
			})(),
			saveToKeystore ?
				this.nativeKeystore
					.then(async keystore => keystore?.setItem(url, value))
					.catch(() => {}) :
				undefined
		]);
	}

	constructor (
		/** @ignore */
		private readonly ngZone: NgZone
	) {
		super();
	}
}
