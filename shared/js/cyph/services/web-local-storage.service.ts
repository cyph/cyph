import {Injectable} from '@angular/core';
import * as localforage from 'localforage';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {env} from '../env';
import {StringProto} from '../proto';
import {lockFunction} from '../util/lock';
import {LocalStorageService} from './local-storage.service';

/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly localforageLock = lockFunction();

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
		try {
			await localforage.ready();
		}
		catch {}
		try {
			await Promise.all(
				Object.keys(localStorage)
					.filter(key => !key.startsWith('localforage/'))
					.map(async key => {
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						const value = localStorage.getItem(key);
						if (value) {
							await this.setItem(key, StringProto, value, false);
						}
					})
			);
		}
		catch {}
	})();

	/** @inheritDoc */
	protected async clearInternal (waitForReady: boolean) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await Promise.all([
			this.localforageLock(async () => localforage.clear()),
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

		const [localforageValue, keystoreValue] = await Promise.all([
			localforage.getItem<Uint8Array | undefined>(url),
			getFromKeystore ?
				this.nativeKeystore
					.then(async keystore => keystore?.getItem(url))
					.catch(() => undefined) :
				undefined
		]);

		const value =
			localforageValue instanceof Uint8Array ?
				localforageValue :
				keystoreValue;

		/*
			Android keystore can get wiped in certain conditions,
			so having redundancy increases reliability.
		*/
		if (
			getFromKeystore &&
			value instanceof Uint8Array &&
			(!(localforageValue instanceof Uint8Array) ||
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

		return localforage.keys();
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
			this.localforageLock(async () => localforage.removeItem(url)),
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
			this.localforageLock(async () =>
				localforage.setItem<Uint8Array>(url, value)
			),
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
