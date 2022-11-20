import {Injectable} from '@angular/core';
import {LocalStorageService} from './local-storage.service';

/**
 * In-memory implementation of LocalStorageService.
 */
@Injectable()
export class InMemoryLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly db = new Map<string, Uint8Array>();

	/** @inheritDoc */
	protected async clearInternal (_WAIT_FOR_READY: boolean) : Promise<void> {
		this.db.clear();
	}

	/** @inheritDoc */
	protected async getItemInternal (
		url: string,
		_WAIT_FOR_READY: boolean,
		_GET_FROM_KEYSTORE: boolean
	) : Promise<Uint8Array> {
		const value = this.db.get(url);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return value;
	}

	/** @inheritDoc */
	protected async getKeysInternal (
		_WAIT_FOR_READY: boolean
	) : Promise<string[]> {
		return Array.from(this.db.keys());
	}

	/** @inheritDoc */
	protected async removeItemInternal (
		url: string,
		_WAIT_FOR_READY: boolean
	) : Promise<void> {
		this.db.delete(url);
	}

	/** @inheritDoc */
	protected async setItemInternal (
		url: string,
		value: Uint8Array,
		_WAIT_FOR_READY: boolean,
		_SAVE_TO_KEYSTORE: boolean
	) : Promise<void> {
		this.db.set(url, value);
	}

	constructor () {
		super();
	}
}
