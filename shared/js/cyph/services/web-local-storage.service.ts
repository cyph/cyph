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
	public async getItem (key: string, waitForReady: boolean = true) : Promise<Uint8Array> {
		if (waitForReady) {
			await this.ready;
		}

		const value	= await localforage.getItem<Uint8Array>(key);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${key} not found.`);
		}

		return value;
	}

	/** @inheritDoc */
	public async removeItem (key: string, waitForReady: boolean = true) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await this.getItem(key);
		await localforage.removeItem(key);
	}

	/** @inheritDoc */
	public async setItem (
		key: string,
		value: DataType,
		waitForReady: boolean = true
	) : Promise<void> {
		if (waitForReady) {
			await this.ready;
		}

		await localforage.setItem<Uint8Array>(key, await util.toBytes(value));
	}

	constructor () {
		super();
	}
}
