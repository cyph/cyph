import {Injectable} from '@angular/core';
import {IProto} from '../iproto';
import {LocalStorageValue} from '../proto';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';


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

	/** @ignore */
	private async getItemHelper<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean
	) : Promise<[T, number]> {
		await this.pendingSets.get(url);

		try {
			this.cache.set(url, await this.getItemInternal(url, waitForReady));
		}
		catch {}

		const data	= this.cache.get(url);

		if (!(data instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		const {timestamp, value}	= await deserialize(LocalStorageValue, data);

		return [await deserialize(proto, value), timestamp];
	}

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

	/** Interface to platform-specific getKeys functionality. */
	protected async getKeysInternal (_WAIT_FOR_READY: boolean) : Promise<string[]> {
		throw new Error('Must provide an implementation of LocalStorageService.getKeysInternal.');
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
		await this.clearInternal(waitForReady).catch(() => {});
	}

	/** @inheritDoc */
	public async getItem<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean = true
	) : Promise<T> {
		return (await this.getItemHelper(url, proto, waitForReady))[0];
	}

	/** Gets items. */
	public async getItems <T> (
		root: string|undefined,
		proto: IProto<T>,
		sortByTimestamp: boolean = false,
		waitForReady: boolean = true
	) : Promise<T[]> {
		return (await this.getValues(root, proto, sortByTimestamp, waitForReady)).map(o => o[1]);
	}

	/** Gets keys. */
	public async getKeys (root?: string, waitForReady: boolean = true) : Promise<string[]> {
		const keys	= Array.from(new Set([
			...Array.from(this.cache.keys()),
			...(await this.getKeysInternal(waitForReady).catch(() => []))
		]));

		return root ? keys.filter(k => k.startsWith(`${root}/`)) : keys;
	}

	/** Gets values in the form [key, item, timestamp]. */
	public async getValues <T> (
		root: string|undefined,
		proto: IProto<T>,
		sortByTimestamp: boolean = false,
		waitForReady: boolean = true
	) : Promise<[string, T, number][]> {
		const values	= await Promise.all((await this.getKeys(root, waitForReady)).map(
			async (url) : Promise<[string, T, number]> => {
				const [item, timestamp]	= await this.getItemHelper(url, proto, waitForReady);
				return [url, item, timestamp];
			}
		));

		return !sortByTimestamp ? values : values.sort((a, b) => a[2] - b[2]);
	}

	/** @inheritDoc */
	public async removeItem (url: string, waitForReady: boolean = true) : Promise<void> {
		this.cache.delete(url);
		await this.removeItemInternal(url, waitForReady).catch(() => {});
	}

	/** @inheritDoc */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		waitForReady: boolean = true
	) : Promise<{url: string}> {
		const promise	= (async () => {
			const data	= await serialize(LocalStorageValue, {
				timestamp: await getTimestamp(),
				value: await serialize(proto, value)
			});

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
