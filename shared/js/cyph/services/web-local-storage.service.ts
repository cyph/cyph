import {Injectable, NgZone} from '@angular/core';
import cordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import * as localforage from 'localforage';
import {env} from '../env';
import {StringProto} from '../proto';
import {lockFunction} from '../util/lock';
import {DialogService} from './dialog.service';
import {LocalStorageService} from './local-storage.service';
import {StringsService} from './strings.service';

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
			if (
				env.isCordovaMobile &&
				(cordovaSQLiteDriver._support === true ||
					(typeof cordovaSQLiteDriver._support === 'function' &&
						(await cordovaSQLiteDriver._support())))
			) {
				/* TODO: Remove this in April 2020 */
				await localforage.ready();
				const oldData = await Promise.all(
					(await localforage.keys()).map(
						async (k) : Promise<[string, unknown]> => [
							k,
							await localforage.getItem(k)
						]
					)
				);
				if (oldData.length > 0) {
					await Promise.all([
						localforage.clear(),
						this.dialogService.toast(
							this.stringsService.sqliteDataMigration,
							10000,
							this.stringsService.ok
						)
					]);
				}

				await localforage.defineDriver(cordovaSQLiteDriver);
				await localforage.setDriver([
					cordovaSQLiteDriver._driver,
					localforage.INDEXEDDB,
					localforage.WEBSQL,
					localforage.LOCALSTORAGE
				]);

				if (oldData.length > 0) {
					await localforage.ready();
					await Promise.all(
						oldData.map(async ([k, v]) => localforage.setItem(k, v))
					);
				}
			}
		}
		catch {}

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

	constructor (
		ngZone: NgZone,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super(ngZone);
	}
}
