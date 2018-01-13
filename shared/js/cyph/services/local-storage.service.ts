import {Injectable} from '@angular/core';
import {IProto} from '../iproto';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {deserialize, serialize} from '../util/serialization';


/**
 * Provides local storage functionality.
 */
@Injectable()
export class LocalStorageService extends DataManagerService {
	/** In-memory cache for faster access. */
	private readonly cache: Map<string, Uint8Array>				= new Map<string, Uint8Array>();

	/** Used to prevent race condition getItem failures. */
	private readonly pendingSets: Map<string, Promise<void>>	= new Map<string, Promise<void>>();

	/** If true, localForage failed and we should stop bugging the user for permission. */
	private setInternalFailed: boolean							= false;

	/** Interface to platform-specific clear functionality. */
	protected async clearInternal (_WAIT_FOR_READY: boolean) : Promise<void> {
		throw new Error('Must provide an implementation of LocalStorageService.clearInternal.');
	}

	/** Interface to platform-specific getItem functionality. */
	protected async getItemInternal (
		_URL: string,
		_WAIT_FOR_READY: boolean
	) : Promise<Uint8Array> {
		throw new Error('Must provide an implementation of LocalStorageService.getItemInternal.');
	}

	/** Interface to platform-specific removeItem functionality. */
	protected async removeItemInternal (_URL: string, _WAIT_FOR_READY: boolean) : Promise<void> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.removeItemInternal.'
		);
	}

	/** Interface to platform-specific setItem functionality. */
	protected async setItemInternal (
		_URL: string,
		_VALUE: Uint8Array,
		_WAIT_FOR_READY: boolean
	) : Promise<void> {
		throw new Error('Must provide an implementation of LocalStorageService.setItemInternal.');
	}

	/** Wipes all local data. */
	public async clear (waitForReady: boolean = true) : Promise<void> {
		this.cache.clear();
		await this.clearInternal(waitForReady);
	}

	/** @inheritDoc */
	public async getItem<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean = true
	) : Promise<T> {
		await this.pendingSets.get(url);

		try {
			this.cache.set(url, await this.getItemInternal(url, waitForReady));
		}
		catch {}

		const value	= this.cache.get(url);

		if (!(value instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		return deserialize(proto, value);
	}

	/** @inheritDoc */
	public async removeItem (url: string, waitForReady: boolean = true) : Promise<void> {
		this.cache.delete(url);
		await this.removeItemInternal(url, waitForReady);
	}

	/** @inheritDoc */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		waitForReady: boolean = true
	) : Promise<{url: string}> {
		const promise	= (async () => {
			const data	= await serialize(proto, value);

			this.cache.set(url, data);

			if (!this.setInternalFailed) {
				try {
					await this.setItemInternal(url, data, waitForReady);
				}
				catch {
					this.setInternalFailed	= true;
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
