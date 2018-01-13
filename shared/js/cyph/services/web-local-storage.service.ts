import {Injectable} from '@angular/core';
import * as localforage from 'localforage';
import {StringProto} from '../proto';
import {LocalStorageService} from './local-storage.service';


/**
 * Provides local storage functionality for the web.
 */
@Injectable()
export class WebLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly ready: Promise<void>	= (async () => {
		try {
			await localforage.ready();
		}
		catch {}
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
		catch {}
	})();

	/** @inheritDoc */
	protected async clearInternal (waitForReady: boolean) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		return localforage.clear();
	}

	/** @inheritDoc */
	protected async getItemInternal (url: string, waitForReady: boolean) : Promise<Uint8Array> {
		if (waitForReady) {
			await this.ready;
		}

		return localforage.getItem<Uint8Array>(url);
	}

	/** @inheritDoc */
	protected async removeItemInternal (url: string, waitForReady: boolean) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		return localforage.removeItem(url);
	}

	/** @inheritDoc */
	protected async setItemInternal (
		url: string,
		value: Uint8Array,
		waitForReady: boolean
	) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await localforage.setItem<Uint8Array>(url, value);
	}

	constructor () {
		super();
	}
}
