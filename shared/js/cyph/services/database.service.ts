import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IAsyncList} from '../iasync-list';
import {IAsyncMap} from '../iasync-map';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {NotificationTypes} from '../proto';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {lockFunction} from '../util/lock';
import {EnvService} from './env.service';


/**
 * Provides online database and storage functionality.
 */
@Injectable()
export class DatabaseService extends DataManagerService {
	/** Configuration of DatabaseService.lock leasing algorithm. */
	protected readonly lockLeaseConfig	= {
		expirationLimit: 180000,
		expirationLowerLimit: 120000,
		updateInterval: 30000
	};

	/** Max number of bytes to upload to non-blob storage. */
	protected readonly nonBlobStorageLimit: number	= 8192;

	/** Namespace for database usage. */
	public readonly namespace: string	=
		(
			this.envService.environment.customBuild !== undefined &&
			this.envService.environment.customBuild.config.usePrimaryNamespace !== true
		) ?
			this.envService.environment.customBuild.namespace :
			'cyph.ws'
	;

	/** Adds namespace to URL. */
	protected processURL (url: string) : string {
		return `${this.namespace.replace(/\./g, '_')}/${url.replace(/^\//, '')}`;
	}

	/** Calls a function. */
	public async callFunction (_NAME: string, _DATA: any) : Promise<any> {
		throw new Error('Must provide an implementation of DatabaseService.callFunction.');
	}

	/**
	 * Checks whether a disconnect is registered at the specified URL.
	 * @returns True if disconnected.
	 * @see setDisconnectTracker
	 */
	public async checkDisconnected (_URL: MaybePromise<string>) : Promise<boolean> {
		throw new Error('Must provide an implementation of DatabaseService.checkDisconnected.');
	}

	/** Tracks whether this client is connected to the database. */
	public connectionStatus () : Observable<boolean> {
		throw new Error('Must provide an implementation of DatabaseService.connectionStatus.');
	}

	/** Downloads value and gives progress. */
	public downloadItem<T> (_URL: MaybePromise<string>, _PROTO: IProto<T>) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		throw new Error('Must provide an implementation of DatabaseService.downloadItem.');
	}

	/** Gets an IAsyncList wrapper for a list. */
	public getAsyncList<T> (
		url: string,
		proto: IProto<T>,
		lock: LockFunction = this.lockFunction(url),
		noBlobStorage: boolean = false
	) : IAsyncList<T> {
		const localLock	= lockFunction();

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncList: IAsyncList<T>	= {
			clear: async () => this.removeItem(url),
			getValue: async () => localLock(async () => this.getList(url, proto)),
			lock,
			pushValue: async value => localLock(async () => {
				await this.pushItem(url, proto, value, noBlobStorage);
			}),
			setValue: async value => localLock(async () =>
				this.setList(url, proto, value, noBlobStorage)
			),
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

	/** Gets an IAsyncMap wrapper for a map. */
	public getAsyncMap<T> (
		url: string,
		proto: IProto<T>,
		lock: LockFunction = this.lockFunction(url),
		noBlobStorage: boolean = false
	) : IAsyncMap<string, T> {
		const localLock			= lockFunction();

		const getItem			= async (key: string) => this.getItem(`${url}/${key}`, proto);

		const getValueHelper	= async (keys: string[]) => new Map<string, T>(
			await Promise.all(keys.map(async (key) : Promise<[string, T]> => [
				key,
				await getItem(key)
			]))
		);

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncMap: IAsyncMap<string, T>	= {
			clear: async () => this.removeItem(url),
			getItem,
			getKeys: async () => this.getListKeys(url),
			getValue: async () => localLock(async () => getValueHelper(await asyncMap.getKeys())),
			hasItem: async key => this.hasItem(`${url}/${key}`),
			lock,
			removeItem: async key => this.removeItem(`${url}/${key}`),
			setItem: async (key, value) => {
				await this.setItem(`${url}/${key}`, proto, value, noBlobStorage);
			},
			setValue: async (mapValue: Map<string, T>) => localLock(async () => {
				await asyncMap.clear();
				await Promise.all(Array.from(mapValue.entries()).map(async ([key, value]) =>
					asyncMap.setItem(key, value)
				));
			}),
			size: async () => (await asyncMap.getKeys()).length,
			updateValue: async f => asyncMap.lock(async () =>
				asyncMap.setValue(await f(await asyncMap.getValue()))
			),
			watch: memoize(() => this.watchListKeys(url).pipe(mergeMap(getValueHelper))),
			watchSize: memoize(() => this.watchListKeys(url).pipe(
				mergeMap(async keys => keys.length)
			))
		};

		return asyncMap;
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
		blockGetValue: boolean = false,
		noBlobStorage: boolean = false
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

				currentHash		= (await this.setItem(url, proto, value, noBlobStorage)).hash;
				currentValue	= value;

				if (ArrayBuffer.isView(oldValue)) {
					potassiumUtil.clearMemory(oldValue);
				}
			}),
			updateValue: async f => asyncValue.lock(async () => {
				const value	= await asyncValue.getValue();
				let newValue: T;
				try {
					newValue	= await f(value);
				}
				catch {
					return;
				}
				await asyncValue.setValue(newValue);
			}),
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
	public async getList<T> (_URL: MaybePromise<string>, _PROTO: IProto<T>) : Promise<T[]> {
		throw new Error('Must provide an implementation of DatabaseService.getList.');
	}

	/** Gets the keys of a list. */
	public async getListKeys (_URL: MaybePromise<string>) : Promise<string[]> {
		throw new Error('Must provide an implementation of DatabaseService.getListKeys.');
	}

	/** Gets the latest metadata known by the database. */
	public async getMetadata (_URL: MaybePromise<string>) : Promise<{
		data?: string;
		hash: string;
		timestamp: number;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.getMetadata.');
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (
		_URL: MaybePromise<string>,
		_F: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		_REASON?: string
	) : Promise<T> {
		throw new Error('Must provide an implementation of DatabaseService.lock.');
	}

	/** Creates and returns a lock function that uses DatabaseService.lock. */
	public lockFunction (url: string) : LockFunction {
		return async <T> (
			f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
			reason?: string
		) =>
			this.lock(url, f, reason)
		;
	}

	/** Checks whether a lock is currently claimed and what the specified reason is. */
	public async lockStatus (_URL: MaybePromise<string>) : Promise<{
		locked: boolean;
		reason: string|undefined;
	}> {
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

	/** Triggers a push notification. */
	public async notify (
		_URL: MaybePromise<string>,
		_TARGET: MaybePromise<string>,
		_NOTIFICATION_TYPE: NotificationTypes,
		_SUB_TYPE?: number
	) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.notify.');
	}

	/**
	 * Pushes an item to a list.
	 * @returns Item database hash and URL.
	 */
	public async pushItem<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>,
		_VALUE: T|((
			key: string,
			previousKey: () => Promise<string|undefined>,
			o: {callback?: () => MaybePromise<void>}
		) => MaybePromise<T>),
		_NO_BLOB_STORAGE?: boolean
	) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.pushItem.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	/** Registers a token with the database server for push notifications. */
	public async registerPushNotifications (_URL: MaybePromise<string>) : Promise<void> {
		throw new Error(
			'Must provide an implementation of DatabaseService.registerPushNotifications.'
		);
	}

	/** Tracks connects at the specfied URL. */
	public async setConnectTracker (
		_URL: MaybePromise<string>,
		_ON_RECONNECT?: () => void
	) : Promise<() => void> {
		throw new Error('Must provide an implementation of DatabaseService.setConnectTracker.');
	}

	/** Tracks disconnects at the specfied URL. */
	public async setDisconnectTracker (
		_URL: MaybePromise<string>,
		_ON_RECONNECT?: () => void
	) : Promise<() => void> {
		throw new Error('Must provide an implementation of DatabaseService.setDisconnectTracker.');
	}

	/**
	 * Sets an item's value.
	 * @returns Item database hash and URL.
	 */
	public async setItem<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>,
		_VALUE: T,
		_NO_BLOB_STORAGE?: boolean
	) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.setItem.');
	}

	/** Sets a list's value. */
	public async setList<T> (
		url: string,
		proto: IProto<T>,
		value: T[],
		noBlobStorage: boolean = false
	) : Promise<void> {
		await this.removeItem(url);
		for (const v of value) {
			await this.pushItem(url, proto, v, noBlobStorage);
		}
	}

	/**
	 * Subscribes to pushed values and deletes them.
	 * @param f Subscribing function; throws exception to abort deletion.
	 */
	public subscribeAndPop<T> (
		url: string,
		proto: IProto<T>,
		f: (value: T) => MaybePromise<void>
	) : Subscription {
		return this.watchListKeyPushes(url).subscribe(async ({key}) => {
			try {
				const fullURL	= `${url}/${key}`;
				await f(await this.getItem(fullURL, proto));
				await this.removeItem(fullURL);
			}
			catch {}
		});
	}

	/** Deletes account and logs out. */
	public async unregister (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.unregister.');
	}

	/** Unegisters a push notification token from the database server. */
	public async unregisterPushNotifications (_URL: MaybePromise<string>) : Promise<void> {
		throw new Error(
			'Must provide an implementation of DatabaseService.unregisterPushNotifications.'
		);
	}

	/** Uploads value and gives progress. */
	public uploadItem<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>,
		_VALUE: T,
		_NO_BLOB_STORAGE?: boolean
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		throw new Error('Must provide an implementation of DatabaseService.uploadItem.');
	}

	/** Waits for lock to be released. */
	public async waitForUnlock (_URL: MaybePromise<string>) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.waitForUnlock.');
	}

	/** Subscribes to a value. */
	public watch<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>
	) : Observable<ITimedValue<T>> {
		throw new Error('Must provide an implementation of DatabaseService.watch.');
	}

	/** Subscribes to whether or not a value exists. */
	public watchExists (_URL: MaybePromise<string>) : Observable<boolean> {
		throw new Error('Must provide an implementation of DatabaseService.watchExists.');
	}

	/** Subscribes to a list of values. */
	public watchList<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>,
		_COMPLETE_ON_EMPTY: boolean = false
	) : Observable<ITimedValue<T>[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchList.');
	}

	/** Subscribes to new keys of a list. */
	public watchListKeyPushes (_URL: MaybePromise<string>) : Observable<{
		key: string;
		previousKey?: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.watchListKeyPushes.');
	}

	/** Subscribes to the keys of a list. */
	public watchListKeys (_URL: MaybePromise<string>) : Observable<string[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchListKeys.');
	}

	/** Subscribes to new values pushed onto a list. */
	public watchListPushes<T> (
		_URL: MaybePromise<string>,
		_PROTO: IProto<T>,
		_COMPLETE_ON_EMPTY: boolean = false,
		_NO_CACHE: boolean = false
	) : Observable<ITimedValue<T>&{key: string; previousKey?: string; url: string}> {
		throw new Error('Must provide an implementation of DatabaseService.watchListPushes.');
	}

	constructor (
		/** @see EnvService */
		protected readonly envService: EnvService
	) {
		super();
	}
}
