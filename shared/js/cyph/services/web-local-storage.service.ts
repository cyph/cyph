import {Injectable} from '@angular/core';
import * as localforage from 'localforage';
import {IProto} from '../iproto';
import {StringProto} from '../protos';
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
							await this.setItem(key, StringProto, value, false);
						}
					})
			);
		}
		catch (_) {}
	})();

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

		const value	= await localforage.getItem<Uint8Array>(url);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return util.deserialize(proto, value);
	}

	/** @inheritDoc */
	public async removeItem (url: string, waitForReady: boolean = true) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		if (await this.hasItem(url)) {
			await localforage.removeItem(url);
		}
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

			await localforage.setItem<Uint8Array>(url, await util.serialize(proto, value));
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
