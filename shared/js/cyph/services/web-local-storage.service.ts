import {Injectable} from '@angular/core';
import {Dexie} from 'dexie';
import * as localforage from 'localforage';
import {extendPrototype as localforageGetItemsInit} from 'localforage-getitems';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {env} from '../env';
import {StringProto} from '../proto';
import {lockFunction} from '../util/lock';
import {debugLogError} from '../util/log';
import {LocalStorageService} from './local-storage.service';

localforageGetItemsInit(localforage);

/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly dexie = (() => {
		const db = new Dexie('WebLocalStorageService');
		db.version(1).stores({data: 'key'});
		return db.table('data');
	})();

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
	private readonly ready: Promise<void> = (async () => {
		/* Temporary migration of local data from localforage to Dexie */
		try {
			await localforage.ready();

			const oldData = Object.entries(await localforage.getItems());

			if (oldData.length > 0) {
				await this.dexie.bulkPut(
					oldData.map(([key, value]) => ({key, value}))
				);

				await localforage.clear();
			}
		}
		catch (err) {
			debugLogError(() => ({localforageToDexieMigrationError: err}));
		}

		try {
			await Promise.all(
				Object.keys(localStorage)
					.map(
						key =>
							/* eslint-disable-next-line @typescript-eslint/tslint/config */
							<[string, string]> [key, localStorage.getItem(key)]
					)
					.filter(([_, value]) => !!value)
					.map(async ([key, value]) =>
						this.setItem(key, StringProto, value, false)
					)
			);
		}
		catch {}
	})();

	/** @ignore */
	private readonly webStorageLock = lockFunction();

	/** @inheritDoc */
	protected async clearInternal (waitForReady: boolean) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await Promise.all([
			this.webStorageLock(async () => this.dexie.clear()),
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
			this.dexie.get(url).then(o => <Uint8Array | undefined> o?.value),
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

		return <any> this.dexie.toCollection().keys();
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
			this.webStorageLock(async () => this.dexie.delete(url)),
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
			this.webStorageLock(async () => this.dexie.put({key: url, value})),
			saveToKeystore ?
				this.nativeKeystore
					.then(async keystore => keystore?.setItem(url, value))
					.catch(() => {}) :
				undefined
		]);
	}

	constructor () {
		super();
	}
}
