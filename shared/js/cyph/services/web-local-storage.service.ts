import {Injectable} from '@angular/core';
import * as localforage from 'localforage';
import {DataType} from '../data-type';
import {util} from '../util';
import {LocalStorageService} from './local-storage.service';


/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** @ignore */
	private ready: Promise<void>	= (async () => {
		await localforage.ready();

		try {
			await Promise.all(
				Object.keys(localStorage).
					filter(key => !key.startsWith('localforage/')).
					map(async key => {
						/* tslint:disable-next-line:ban */
						const value	= localStorage.getItem(key);
						if (value) {
							await this.setItem(key, value, false);
						}
					})
			);
		}
		catch (_) {}
	})();

	/** @inheritDoc */
	public async getItem (url: string, waitForReady: boolean = true) : Promise<Uint8Array> {
		if (waitForReady) {
			await this.ready;
		}

		await this.pendingSets.get(url);

		const value	= await localforage.getItem<Uint8Array>(url);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return value;
	}

	/** @inheritDoc */
	public async removeItem (url: string, waitForReady: boolean = true) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await this.getItem(url);
		await localforage.removeItem(url);
	}

	/** @inheritDoc */
	public async setItem (
		url: string,
		value: DataType,
		waitForReady: boolean = true
	) : Promise<{url: string}> {
		const promise	= (async () => {
			if (waitForReady) {
				await this.ready;
			}

			await localforage.setItem<Uint8Array>(url, await util.toBytes(value));
			return {url};
		})();

		this.pendingSets.set(url, promise.then(() => {}));

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
