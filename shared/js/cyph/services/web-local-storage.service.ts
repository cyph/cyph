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
	/** @inheritDoc */
	public async getItem (key: string) : Promise<Uint8Array> {
		const value	= await localforage.getItem<Uint8Array>(key);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${key} not found.`);
		}

		return value;
	}

	/** @inheritDoc */
	public async removeItem (key: string) : Promise<void> {
		await this.getItem(key);
		await localforage.removeItem(key);
	}

	/** @inheritDoc */
	public async setItem (key: string, value: DataType) : Promise<void> {
		await localforage.setItem<Uint8Array>(key, await util.toBytes(value));
	}

	constructor () {
		super();
	}
}
