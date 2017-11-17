import {Injectable} from '@angular/core';
import {memoize} from 'lodash';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {take} from 'rxjs/operators/take';
import {Subscription} from 'rxjs/Subscription';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IAsyncList} from '../iasync-list';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {LockFunction} from '../lock-function-type';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {lockFunction} from '../util/lock';


/**
 * Provides online database and storage functionality.
 */
@Injectable()
export class DatabaseService extends DataManagerService {
	/**
	 * Checks whether a disconnect is registered at the specified URL.
	 * @returns True if disconnected.
	 * @see setDisconnectTracker
	 */
	public async checkDisconnected (_URL: string) : Promise<boolean> {
		throw new Error('Must provide an implementation of DatabaseService.checkDisconnected.');
	}

	/** Tracks whether this client is connected to the database. */
	public connectionStatus () : Observable<boolean> {
		throw new Error('Must provide an implementation of DatabaseService.connectionStatus.');
	}

	/** Downloads value and gives progress. */
	public downloadItem<T> (_URL: string, _PROTO: IProto<T>) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		throw new Error('Must provide an implementation of DatabaseService.downloadItem.');
	}

	/** Gets an IAsyncList wrapper for a list. */
	public getAsyncList<T> (
		url: string,
		proto: IProto<T>,
		lock: LockFunction = this.lockFunction(url)
	) : IAsyncList<T> {
		const localLock		= lockFunction();

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncList: IAsyncList<T>	= {
			getValue: async () => localLock(async () => this.getList(url, proto)),
			lock,
			pushValue: async value => localLock(async () => {
				await this.pushItem(url, proto, value);
			}),
			setValue: async value => localLock(async () => this.setList(url, proto, value)),
			subscribeAndPop: f => this.subscribeAndPop(url, proto, f),
			updateValue: async f => asyncList.lock(async () =>
				asyncList.setValue(await f(await asyncList.getValue()))
			),
			watch: memoize(() => this.watchList(url, proto).pipe(
				map<ITimedValue<T>[], T[]>(arr => arr.map(o => o.value))
			)),
			watchPushes: memoize(() =>
				this.watchListPushes(url, proto).pipe(map<ITimedValue<T>, T>(o => o.value))
			)
		};

		return asyncList;
	}

	/**
	 * Gets an IAsyncValue wrapper for an item.
	 * @param blockGetValue If true, getValue will block until a value is set.
	 * Otherwise, when a value has not been set, a default value will be returned.
	 */
	public getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		lock: LockFunction = this.lockFunction(url),
		blockGetValue: boolean = false
	) : IAsyncValue<T> {
		const defaultValue	= proto.create();
		const localLock		= lockFunction();

		let currentHash: string|undefined;
		let currentValue	= defaultValue;

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncValue: IAsyncValue<T>	= {
			getValue: async () => localLock(async () : Promise<T> => {
				const {hash}	= await this.getMetadata(url);

				/* tslint:disable-next-line:possible-timing-attack */
				if (currentHash === hash) {
					return currentValue;
				}
				else if (ArrayBuffer.isView(currentValue)) {
					potassiumUtil.clearMemory(currentValue);
				}

				const value	= await this.getItem(url, proto);

				/* tslint:disable-next-line:possible-timing-attack */
				if (hash !== (await this.getMetadata(url)).hash) {
					return asyncValue.getValue();
				}

				currentHash		= hash;
				currentValue	= value;

				return currentValue;
			}).catch(async () => blockGetValue ?
				asyncValue.watch().pipe(take(2)).toPromise() :
				defaultValue
			),
			lock,
			setValue: async value => localLock(async () => {
				const oldValue	= currentValue;

				currentHash		= (await this.setItem(url, proto, value)).hash;
				currentValue	= value;

				if (ArrayBuffer.isView(oldValue)) {
					potassiumUtil.clearMemory(oldValue);
				}
			}),
			updateValue: async f => asyncValue.lock(async () =>
				asyncValue.setValue(await f(await asyncValue.getValue()))
			),
			watch: memoize(() =>
				this.watch(url, proto).pipe(map<ITimedValue<T>, T>(o => o.value))
			)
		};

		return asyncValue;
	}

	/** @inheritDoc */
	public async getItem<T> (url: string, proto: IProto<T>) : Promise<T> {
		return (await (await this.downloadItem(url, proto)).result).value;
	}

	/** Gets a list of values. */
	public async getList<T> (_URL: string, _PROTO: IProto<T>) : Promise<T[]> {
		throw new Error('Must provide an implementation of DatabaseService.getList.');
	}

	/** Gets the keys of a list. */
	public async getListKeys (_URL: string) : Promise<string[]> {
		throw new Error('Must provide an implementation of DatabaseService.getListKeys.');
	}

	/** Gets the latest metadata known by the database. */
	public async getMetadata (_URL: string) : Promise<{hash: string; timestamp: number}> {
		throw new Error('Must provide an implementation of DatabaseService.getMetadata.');
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (
		_URL: string,
		_F: (reason?: string) => Promise<T>,
		_REASON?: string
	) : Promise<T> {
		throw new Error('Must provide an implementation of DatabaseService.lock.');
	}

	/** Creates and returns a lock function that uses DatabaseService.lock. */
	public lockFunction (url: string) : LockFunction {
		return async <T> (f: (reason?: string) => Promise<T>, reason?: string) =>
			this.lock(url, f, reason)
		;
	}

	/** Checks whether a lock is currently claimed and what the specified reason is. */
	public async lockStatus (_URL: string) : Promise<{locked: boolean; reason: string|undefined}> {
		throw new Error('Must provide an implementation of DatabaseService.lockStatus.');
	}

	/** Logs in. */
	public async login (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.login.');
	}

	/** Logs out. */
	public async logout () : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.logout.');
	}

	/**
	 * Pushes an item to a list.
	 * @returns Item database hash and URL.
	 */
	public async pushItem<T> (_URL: string, _PROTO: IProto<T>, _VALUE: T) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.pushItem.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	/** Tracks connects at the specfied URL. */
	public async setConnectTracker (
		_URL: string,
		_ON_RECONNECT?: () => void
	) : Promise<() => void> {
		throw new Error('Must provide an implementation of DatabaseService.setConnectTracker.');
	}

	/** Tracks disconnects at the specfied URL. */
	public async setDisconnectTracker (
		_URL: string,
		_ON_RECONNECT?: () => void
	) : Promise<() => void> {
		throw new Error('Must provide an implementation of DatabaseService.setDisconnectTracker.');
	}

	/**
	 * Sets an item's value.
	 * @returns Item database hash and URL.
	 */
	public async setItem<T> (_URL: string, _PROTO: IProto<T>, _VALUE: T) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.setItem.');
	}

	/** Sets a list's value. */
	public async setList<T> (url: string, proto: IProto<T>, value: T[]) : Promise<void> {
		await this.removeItem(url);
		for (const v of value) {
			await this.pushItem(url, proto, v);
		}
	}

	/** Subscribes to pushed values and deletes them. */
	public subscribeAndPop<T> (
		url: string,
		proto: IProto<T>,
		f: (value: T) => void|Promise<void>
	) : Subscription {
		return this.watchListKeyPushes(url).subscribe(async key => {
			const fullURL	= `${url}/${key}`;
			await f(await this.getItem(fullURL, proto));
			await this.removeItem(fullURL);
		});
	}

	/** Deletes account and logs out. */
	public async unregister (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.unregister.');
	}

	/** Uploads value and gives progress. */
	public uploadItem<T> (_URL: string, _PROTO: IProto<T>, _VALUE: T) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		throw new Error('Must provide an implementation of DatabaseService.uploadItem.');
	}

	/** Waits for lock to be released. */
	public async waitForUnlock (_URL: string) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.waitForUnlock.');
	}

	/** Subscribes to a value. */
	public watch<T> (_URL: string, _PROTO: IProto<T>) : Observable<ITimedValue<T>> {
		throw new Error('Must provide an implementation of DatabaseService.watch.');
	}

	/** Subscribes to a list of values. */
	public watchList<T> (
		_URL: string,
		_PROTO: IProto<T>,
		_COMPLETE_ON_EMPTY: boolean = false
	) : Observable<ITimedValue<T>[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchList.');
	}

	/** Subscribes to new keys of a list. */
	public watchListKeyPushes (_URL: string) : Observable<string> {
		throw new Error('Must provide an implementation of DatabaseService.watchListKeyPushes.');
	}

	/** Subscribes to the keys of a list. */
	public watchListKeys (_URL: string) : Observable<string[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchListKeys.');
	}

	/** Subscribes to new values pushed onto a list. */
	public watchListPushes<T> (
		_URL: string,
		_PROTO: IProto<T>,
		_COMPLETE_ON_EMPTY: boolean = false,
		_NO_CACHE: boolean = false
	) : Observable<ITimedValue<T>&{url: string}> {
		throw new Error('Must provide an implementation of DatabaseService.watchListPushes.');
	}

	constructor () {
		super();
	}
}
