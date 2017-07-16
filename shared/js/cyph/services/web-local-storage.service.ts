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
	/**
	 * Created to use instead of localforage if setting ever fails,
	 * mainly to avoid annoying repetitive user prompts in Safari.
	 */
	private failureFallback?: Map<string, Uint8Array>;

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
	public clear () : Promise<void> {
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

		const value	=
			(await localforage.getItem<Uint8Array>(url).catch(() => undefined)) ||
			(this.failureFallback ? this.failureFallback.get(url) : undefined)
		;

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

		if (!(await this.hasItem(url))) {
			return;
		}

		const error	= await (async () => {
			await localforage.removeItem(url);
		})().catch(
			(err: any) => err
		);

		if (this.failureFallback) {
			const success	= this.failureFallback.delete(url);
			if (success) {
				return;
			}
		}

		if (error) {
			throw error;
		}
	}

	/** @inheritDoc */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		waitForReady: boolean = true
	) : Promise<{url: string}> {
		const data	= await util.serialize(proto, value);

		if (this.failureFallback) {
			this.failureFallback.set(url, data);
			return {url};
		}

		const promise	= (async () => {
			if (waitForReady) {
				await this.ready;
			}

			await localforage.setItem<Uint8Array>(url, data);
			return {url};
		})();

		this.pendingSets.set(url, promise.then(() => {}));

		try {
			return await promise;
		}
		catch (_) {
			this.failureFallback	= new Map<string, Uint8Array>();
			this.failureFallback.set(url, data);
			return {url};
		}
		finally {
			this.pendingSets.delete(url);
		}
	}

	constructor () {
		super();
	}
}
