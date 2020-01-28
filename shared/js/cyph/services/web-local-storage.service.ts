import {Injectable, NgZone} from '@angular/core';
import * as localforage from 'localforage';
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

		return this.localforageLock(async () => localforage.clear());
	}

	/** @inheritDoc */
	protected async getItemInternal (
		url: string,
		waitForReady: boolean
	) : Promise<Uint8Array> {
		if (waitForReady) {
			await this.ready;
		}

		const value = await localforage.getItem<Uint8Array>(url);

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

		return this.localforageLock(async () => localforage.removeItem(url));
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

		await this.localforageLock(async () =>
			localforage.setItem<Uint8Array>(url, value)
		);
	}

	constructor (ngZone: NgZone) {
		super(ngZone);
	}
}
