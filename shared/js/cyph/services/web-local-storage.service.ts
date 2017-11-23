import {Injectable} from '@angular/core';
import * as localforage from 'localforage';
import {IProto} from '../iproto';
import {StringProto} from '../proto';
import {deserialize, serialize} from '../util/serialization';
import {LocalStorageService} from './local-storage.service';


/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** In-memory cache for faster access. */
	private readonly cache: Map<string, Uint8Array>	= new Map<string, Uint8Array>();

	/** If true, localForage failed and we should stop bugging the user for permission. */
	private localForageSetFailed: boolean			= false;

	/** @ignore */
	private ready: Promise<void>	= (async () => {
		try {
			await localforage.ready();
		}
		catch (_) {}
		try {
			await Promise.all(
				Object.keys(localStorage).
					filter(key => !key.startsWith('localforage/')).
					map(async key => {
						/* tslint:disable-next-line:ban */
						const value	= localStorage.getItem(key);
						if (value) {
							await this.setItem(key, StringProto, value, false);
						}
					})
			);
		}
		catch (_) {}
	})();

	/** @inheritDoc */
	public async clear () : Promise<void> {
		await this.ready;
		this.cache.clear();
		return localforage.clear();
	}

	/** @inheritDoc */
	public async getItem<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean = true
	) : Promise<T> {
		if (waitForReady) {
			await this.ready;
		}

		await this.pendingSets.get(url);

		if (!this.cache.has(url)) {
			try {
				this.cache.set(url, await localforage.getItem<Uint8Array>(url));
			}
			catch (_) {}
		}

		const value	= this.cache.get(url);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return deserialize(proto, value);
	}

	/** @inheritDoc */
	public async removeItem (url: string, waitForReady: boolean = true) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		this.cache.delete(url);
		await localforage.removeItem(url);
	}

	/** @inheritDoc */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		waitForReady: boolean = true
	) : Promise<{url: string}> {
		const promise	= (async () => {
			if (waitForReady) {
				await this.ready;
			}

			const data	= await serialize(proto, value);

			this.cache.set(url, data);

			if (!this.localForageSetFailed) {
				try {
					await localforage.setItem<Uint8Array>(url, data);
				}
				catch (_) {
					this.localForageSetFailed	= true;
				}
			}

			return {url};
		})();

		this.pendingSets.set(url, promise.then(() => {}).catch(() => {}));

		try {
			return await promise;
		}
		finally {
			this.pendingSets.delete(url);
		}
	}

	constructor () {
		super();
	}
}
