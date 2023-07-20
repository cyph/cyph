/* eslint-disable @typescript-eslint/require-await, max-lines */

import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subscription} from 'rxjs';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {
	BinaryProto,
	ILocalStorageLockMetadata,
	ILocalStorageValue,
	LocalStorageLockMetadata,
	LocalStorageValue
} from '../proto';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {filterUndefined} from '../util/filter/base';
import {getOrSetDefault} from '../util/get-or-set-default';
import {debugLog} from '../util/log';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';

/**
 * Provides local storage functionality.
 */
@Injectable()
export class LocalStorageService extends DataManagerService {
	/** @ignore */
	private readonly broadcastChannelKeys = {
		clear: 'LocalStorageService-clear',
		item: 'LocalStorageService-item',
		lock: 'LocalStorageService-lock'
	};

	/** In-memory cache for faster access. */
	private readonly cache: Map<string, Uint8Array> = new Map<
		string,
		Uint8Array
	>();

	/** Lock configuration settings. */
	private readonly lockConfig = {
		claimDelay: 100,
		interval: 50,
		root: 'LocalStorageService-locks',
		timeout: 60000
	};

	/** @ignore */
	private readonly observableCaches = {
		watch: new Map<string, Observable<ITimedValue<any>>>()
	};

	/** Used to prevent race condition getItem failures. */
	private readonly pendingSets: Map<string, Promise<void>> = new Map<
		string,
		Promise<void>
	>();

	/** If true, storage engine failed and we should stop bugging the user for permission. */
	private setInternalFailed: boolean = false;

	/** @ignore */
	private readonly watchFallbackInterval = 10000;

	/** Interface to platform-specific clear functionality. */
	protected async clearInternal (_WAIT_FOR_READY: boolean) : Promise<void> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.clearInternal.'
		);
	}

	/** Interface to platform-specific getItem functionality. */
	protected async getItemInternal (
		_URL: string,
		_WAIT_FOR_READY: boolean,
		_GET_FROM_KEYSTORE: boolean = false
	) : Promise<Uint8Array> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.getItemInternal.'
		);
	}

	/** Interface to platform-specific getKeys functionality. */
	protected async getKeysInternal (
		_WAIT_FOR_READY: boolean
	) : Promise<string[]> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.getKeysInternal.'
		);
	}

	/** Interface to platform-specific removeItem functionality. */
	protected async removeItemInternal (
		_URL: string,
		_WAIT_FOR_READY: boolean
	) : Promise<void> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.removeItemInternal.'
		);
	}

	/** Interface to platform-specific setItem functionality. */
	protected async setItemInternal (
		_URL: string,
		_VALUE: Uint8Array,
		_WAIT_FOR_READY: boolean,
		_SAVE_TO_KEYSTORE: boolean
	) : Promise<void> {
		throw new Error(
			'Must provide an implementation of LocalStorageService.setItemInternal.'
		);
	}

	/** Wipes all local data. */
	public async clear (waitForReady: boolean = true) : Promise<void> {
		this.cache.clear();
		await this.clearInternal(waitForReady).catch(() => {});

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof BroadcastChannel === 'undefined') {
			return;
		}

		const channel = new BroadcastChannel(this.broadcastChannelKeys.clear);
		channel.postMessage(undefined);
		channel.close();
	}

	/** @inheritDoc */
	public async getItem<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean = true,
		getFromKeystore: boolean = false
	) : Promise<T> {
		return (
			await this.getValue(
				url,
				proto,
				waitForReady,
				undefined,
				getFromKeystore
			)
		)[1];
	}

	/** Gets items. */
	public async getItems<T> (
		root: string | undefined,
		proto: IProto<T>,
		sortByTimestamp: boolean = false,
		waitForReady: boolean = true,
		getFromKeystore: boolean = false
	) : Promise<T[]> {
		return (
			await this.getValues(
				root,
				proto,
				sortByTimestamp,
				waitForReady,
				getFromKeystore
			)
		).map(o => o[1]);
	}

	/** Gets item timestamp. */
	public async getItemTimestamp (
		url: string,
		waitForReady: boolean = true,
		getFromKeystore: boolean = false
	) : Promise<number> {
		return (
			await this.getValue(
				url,
				BinaryProto,
				waitForReady,
				undefined,
				getFromKeystore
			)
		)[2];
	}

	/** Gets keys. */
	public async getKeys (
		root?: string,
		waitForReady: boolean = true
	) : Promise<string[]> {
		const keys = Array.from(
			new Set([
				...Array.from(this.cache.keys()),
				...(await this.getKeysInternal(waitForReady).catch(() => []))
			])
		);

		return root ? keys.filter(k => k.startsWith(`${root}/`)) : keys;
	}

	/** Gets value in the form [key, item, timestamp]. */
	public async getValue<T> (
		url: string,
		proto: IProto<T>,
		waitForReady: boolean = true,
		skipCache: boolean = false,
		getFromKeystore: boolean = false
	) : Promise<[string, T, number]> {
		await this.pendingSets.get(url);

		const data = await (skipCache ?
			this.getItemInternal(url, waitForReady, getFromKeystore) :
			(async () => {
				try {
					this.cache.set(
						url,
						await this.getItemInternal(
							url,
							waitForReady,
							getFromKeystore
						)
					);
				}
				catch {}

				return this.cache.get(url);
			})());

		if (!(data instanceof Uint8Array)) {
			throw new Error(`Item ${url} not found.`);
		}

		const {timestamp, value} = await deserialize(LocalStorageValue, data);

		return [url, await deserialize(proto, value), timestamp];
	}

	/** Gets values in the form [key, item, timestamp]. */
	public async getValues<T> (
		root: string | undefined,
		proto: IProto<T>,
		sortByTimestamp: boolean = false,
		waitForReady: boolean = true,
		getFromKeystore: boolean = false
	) : Promise<[string, T, number][]> {
		const values = filterUndefined(
			await Promise.all(
				(await this.getKeys(root, waitForReady)).map(async url =>
					this.getValue(
						url,
						proto,
						waitForReady,
						undefined,
						getFromKeystore
					).catch(() => undefined)
				)
			)
		);

		return !sortByTimestamp ? values : values.sort((a, b) => a[2] - b[2]);
	}

	/** @inheritDoc */
	public async hasItem (
		url: string,
		getFromKeystore: boolean = false
	) : Promise<boolean> {
		try {
			await this.getItem(url, BinaryProto, undefined, getFromKeystore);
			return true;
		}
		catch {
			return false;
		}
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (
		url: string,
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		const stillOwner = new BehaviorSubject<boolean>(true);

		const lockURL = `${this.lockConfig.root}/${url}`;
		const id = uuid();
		const metadata = {id, reason};
		const channel =
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			typeof BroadcastChannel !== 'undefined' ?
				new BroadcastChannel(
					`${this.broadcastChannelKeys.lock}:${lockURL}`
				) :
				undefined;

		debugLog(() => ({localStorageLockWaiting: {id, lockURL, stillOwner}}));

		const getLockValue = async () =>
			this.getValue(
				lockURL,
				LocalStorageLockMetadata,
				undefined,
				true
			).catch(() => undefined);

		let lastReason: string | undefined;

		while (true) {
			const [lockValue, timestamp] = await Promise.all([
				getLockValue(),
				getTimestamp()
			]);

			if (lockValue !== undefined && lockValue[1].id === id) {
				break;
			}

			if (
				!(
					lockValue === undefined ||
					!lockValue[1].id ||
					isNaN(lockValue[2]) ||
					timestamp - lockValue[2] > this.lockConfig.timeout
				)
			) {
				const unlocked = resolvable();

				if (channel) {
					channel.onmessage = () => {
						unlocked.resolve();
					};
				}

				await Promise.race([unlocked, sleep(this.lockConfig.interval)]);
				continue;
			}

			lastReason = lockValue ? lockValue[1].reason : undefined;
			await this.setItem(
				lockURL,
				LocalStorageLockMetadata,
				metadata,
				undefined,
				true
			);
			await sleep(this.lockConfig.claimDelay);
		}

		debugLog(() => ({localStorageLockClaimed: {id, lockURL, stillOwner}}));

		const promise = f({reason: lastReason, stillOwner});

		let active = true;
		const finished = promise
			.catch(() => {})
			.then(() => {
				active = false;
			});

		while (active) {
			const lockValue = await getLockValue();

			if (lockValue === undefined || lockValue[1].id !== id) {
				stillOwner.next(false);
				return promise;
			}

			await this.setItem(
				lockURL,
				LocalStorageLockMetadata,
				metadata,
				undefined,
				true
			);
			await Promise.race([finished, sleep(this.lockConfig.interval)]);
		}

		try {
			return await promise;
		}
		finally {
			if (reason) {
				await this.setItem<ILocalStorageLockMetadata>(
					lockURL,
					LocalStorageLockMetadata,
					{reason},
					undefined,
					true
				);
			}
			else {
				await this.removeItem(lockURL, undefined, true);
			}

			if (channel) {
				channel.postMessage(undefined);
				channel.close();
			}

			debugLog(() => ({
				localStorageLockReleased: {id, lockURL, stillOwner}
			}));
		}
	}

	/** @inheritDoc */
	public async removeItem (
		url: string,
		waitForReady: boolean = true,
		skipCache: boolean = false
	) : Promise<void> {
		if (!skipCache) {
			this.cache.delete(url);
		}

		await this.removeItemInternal(url, waitForReady).catch(() => {});

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof BroadcastChannel === 'undefined') {
			return;
		}

		const channel = new BroadcastChannel(
			`${this.broadcastChannelKeys.item}:${url}`
		);
		channel.postMessage(undefined);
		channel.close();
	}

	/** @inheritDoc */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		waitForReady: boolean = true,
		skipCache: boolean = false,
		saveToKeystore: boolean = false
	) : Promise<{url: string}> {
		const promise = (async () => {
			const data = await serialize<ILocalStorageValue>(
				LocalStorageValue,
				{
					timestamp: await getTimestamp(),
					value: await serialize(proto, value)
				}
			);

			if (!skipCache) {
				this.cache.set(url, data);
			}

			if (!this.setInternalFailed) {
				try {
					await this.setItemInternal(
						url,
						data,
						waitForReady,
						saveToKeystore
					);
				}
				catch {
					this.setInternalFailed = true;
				}
			}

			return {url};
		})();

		this.pendingSets.set(
			url,
			promise.then(() => {}).catch(() => {})
		);

		try {
			return await promise;
		}
		finally {
			this.pendingSets.delete(url);

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			if (typeof BroadcastChannel !== 'undefined') {
				const channel = new BroadcastChannel(
					`${this.broadcastChannelKeys.item}:${url}`
				);
				channel.postMessage(undefined);
				channel.close();
			}
		}
	}

	/** @inheritDoc */
	public watch<T> (
		url: string,
		proto: IProto<T>,
		_SUBSCRIPTIONS?: Subscription[]
	) : Observable<ITimedValue<T>> {
		return getOrSetDefault(this.observableCaches.watch, url, () => {
			const subject = new ReplaySubject<ITimedValue<T>>(Infinity);

			const channel =
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				typeof BroadcastChannel !== 'undefined' ?
					new BroadcastChannel(
						`${this.broadcastChannelKeys.item}:${url}`
					) :
					undefined;

			const clearChannel =
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				typeof BroadcastChannel !== 'undefined' ?
					new BroadcastChannel(this.broadcastChannelKeys.clear) :
					undefined;

			let unlocked = resolvable();

			if (channel) {
				channel.onmessage = () => {
					unlocked.resolve();
				};
			}
			if (clearChannel) {
				clearChannel.onmessage = () => {
					this.cache.clear();
					unlocked.resolve();
				};
			}

			(async () => {
				while (!this.destroyed.value) {
					subject.next({
						timestamp: await getTimestamp(),
						value: await this.getItem(url, proto).catch(() =>
							proto.create()
						)
					});

					if (!channel) {
						await sleep(this.watchFallbackInterval);
						continue;
					}

					unlocked = resolvable();

					await unlocked;
				}
			})();

			return subject;
		});
	}

	constructor () {
		super();

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof BroadcastChannel === 'undefined') {
			return;
		}

		new BroadcastChannel(this.broadcastChannelKeys.clear).onmessage =
			() => {
				this.cache.clear();
			};
	}
}
