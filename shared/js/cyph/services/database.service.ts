import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {DataType} from '../data-type';
import {LockFunction} from '../lock-function-type';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {util} from '../util';


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
	public downloadItem (_URL: string) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: Uint8Array}>;
	} {
		throw new Error('Must provide an implementation of DatabaseService.downloadItem.');
	}

	/**
	 * Downloads a value as a boolean.
	 * @see downloadItem
	 */
	public downloadItemBoolean (url: string) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: boolean}>;
	} {
		const o	= this.downloadItem(url);
		return {
			progress: o.progress,
			result: o.result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToBoolean(value)
			}))
		};
	}

	/**
	 * Downloads a value as a number.
	 * @see downloadItem
	 */
	public downloadItemNumber (url: string) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: number}>;
	} {
		const o	= this.downloadItem(url);
		return {
			progress: o.progress,
			result: o.result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToNumber(value)
			}))
		};
	}

	/**
	 * Downloads a value as an object.
	 * @see downloadItem
	 */
	public downloadItemObject<T> (url: string, proto: {decode: (bytes: Uint8Array) => T}) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: T}>;
	} {
		const o	= this.downloadItem(url);
		return {
			progress: o.progress,
			result: o.result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToObject<T>(value, proto)
			}))
		};
	}

	/**
	 * Downloads a value as a string.
	 * @see downloadItem
	 */
	public downloadItemString (url: string) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: string}>;
	} {
		const o	= this.downloadItem(url);
		return {
			progress: o.progress,
			result: o.result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToString(value)
			}))
		};
	}

	/**
	 * Downloads a value as a base64 data URI.
	 * @see downloadItem
	 */
	public downloadItemURI (url: string) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: string}>;
	} {
		const o	= this.downloadItem(url);
		return {
			progress: o.progress,
			result: o.result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToDataURI(value)
			}))
		};
	}

	/** @inheritDoc */
	public async getItem (url: string) : Promise<Uint8Array> {
		return (await (await this.downloadItem(url)).result).value;
	}

	/** Gets a list of values. */
	public async getList (_URL: string) : Promise<Uint8Array[]> {
		throw new Error('Must provide an implementation of DatabaseService.getList.');
	}

	/**
	 * Gets a list as booleans.
	 * @see getList
	 */
	public async getListBoolean (url: string) : Promise<boolean[]> {
		return (await this.getList(url)).map(value => util.bytesToBoolean(value));
	}

	/**
	 * Gets a list as numbers.
	 * @see getList
	 */
	public async getListNumber (url: string) : Promise<number[]> {
		return (await this.getList(url)).map(value => util.bytesToNumber(value));
	}

	/**
	 * Gets a list as objects.
	 * @see getList
	 */
	public async getListObject<T> (
		url: string,
		proto: {decode: (bytes: Uint8Array) => T}
	) : Promise<T[]> {
		return (await this.getList(url)).map(value => util.bytesToObject<T>(value, proto));
	}

	/**
	 * Gets a list as strings.
	 * @see getList
	 */
	public async getListString (url: string) : Promise<string[]> {
		return (await this.getList(url)).map(value => util.bytesToString(value));
	}

	/**
	 * Gets a list as base64 data URIs.
	 * @see getList
	 */
	public async getListURI (url: string) : Promise<string[]> {
		return (await this.getList(url)).map(value => util.bytesToDataURI(value));
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
	 * @returns Item URL.
	 */
	public async pushItem<T = never> (_URL: string, _VALUE: DataType<T>) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.pushItem.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	/** Tracks disconnects at the specfied URL. */
	public async setDisconnectTracker (_URL: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.setDisconnectTracker.');
	}

	/**
	 * Pushes an item to a list.
	 * @returns Item URL.
	 */
	public async setItem<T = never> (_URL: string, _VALUE: DataType<T>) : Promise<{
		hash: string;
		url: string;
	}> {
		throw new Error('Must provide an implementation of DatabaseService.setItem.');
	}

	/** Uploads value and gives progress. */
	public uploadItem<T = never> (_URL: string, _VALUE: DataType<T>) : {
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

	/** Subscribes to a list of values. Completes when the list no longer exists. */
	public watchList<T = Uint8Array> (
		_URL: string,
		_MAPPER?: (value: Uint8Array) => T|Promise<T>
	) : Observable<{timestamp: number; value: T}[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchList.');
	}

	/**
	 * Subscribes to a list of values as booleans.
	 * @see watchList
	 */
	public watchListBoolean (url: string) : Observable<{timestamp: number; value: boolean}[]> {
		return this.watchList<boolean>(url, value => util.bytesToBoolean(value));
	}

	/**
	 * Subscribes to a list of values as numbers.
	 * @see watchList
	 */
	public watchListNumber (url: string) : Observable<{timestamp: number; value: number}[]> {
		return this.watchList<number>(url, value => util.bytesToNumber(value));
	}

	/**
	 * Subscribes to a list of values as objects.
	 * @see watchList
	 */
	public watchListObject<T> (
		url: string,
		proto: {decode: (bytes: Uint8Array) => T}
	) : Observable<{timestamp: number; value: T}[]> {
		return this.watchList<T>(url, value => util.bytesToObject<T>(value, proto));
	}

	/**
	 * Subscribes to a list of values as strings.
	 * @see watchList
	 */
	public watchListString (url: string) : Observable<{timestamp: number; value: string}[]> {
		return this.watchList<string>(url, value => util.bytesToString(value));
	}

	/**
	 * Subscribes to a list of values as base64 data URIs.
	 * @see watchList
	 */
	public watchListURI (url: string) : Observable<{timestamp: number; value: string}[]> {
		return this.watchList<string>(url, value => util.bytesToDataURI(value));
	}

	/** Subscribes to a possibly-undefined value. */
	public watchMaybe (
		_URL: string
	) : Observable<{timestamp: number; value: Uint8Array}|undefined> {
		throw new Error('Must provide an implementation of DatabaseService.watchMaybe.');
	}

	/**
	 * Subscribes to a possibly-undefined value as a boolean.
	 * @see watchMaybe
	 */
	public watchMaybeBoolean (
		url: string
	) : Observable<{timestamp: number; value: boolean}|undefined> {
		return this.watchMaybe(url).map(o => o === undefined ? undefined : {
			timestamp: o.timestamp,
			value: util.bytesToBoolean(o.value)
		});
	}

	/**
	 * Subscribes to a possibly-undefined value as a number.
	 * @see watchMaybe
	 */
	public watchMaybeNumber (
		url: string
	) : Observable<{timestamp: number; value: number}|undefined> {
		return this.watchMaybe(url).map(o => o === undefined ? undefined : {
			timestamp: o.timestamp,
			value: util.bytesToNumber(o.value)
		});
	}

	/**
	 * Subscribes to a possibly-undefined value as an object.
	 * @see watchMaybe
	 */
	public watchMaybeObject<T> (
		url: string,
		proto: {decode: (bytes: Uint8Array) => T}
	) : Observable<{timestamp: number; value: T}|undefined> {
		return this.watchMaybe(url).map(o => o === undefined ? undefined : {
			timestamp: o.timestamp,
			value: util.bytesToObject<T>(o.value, proto)
		});
	}

	/**
	 * Subscribes to a possibly-undefined value as a string.
	 * @see watchMaybe
	 */
	public watchMaybeString (
		url: string
	) : Observable<{timestamp: number; value: string}|undefined> {
		return this.watchMaybe(url).map(o => o === undefined ? undefined : {
			timestamp: o.timestamp,
			value: util.bytesToString(o.value)
		});
	}

	/**
	 * Subscribes to a possibly-undefined value as a base64 data URI.
	 * @see watchMaybe
	 */
	public watchMaybeURI (
		url: string
	) : Observable<{timestamp: number; value: string}|undefined> {
		return this.watchMaybe(url).map(o => o === undefined ? undefined : {
			timestamp: o.timestamp,
			value: util.bytesToDataURI(o.value)
		});
	}

	/** Subscribes to a value. */
	public watchValue (
		url: string,
		defaultValue: () => Uint8Array|Promise<Uint8Array> = () => new Uint8Array([])
	) : Observable<{timestamp: number; value: Uint8Array}> {
		return this.watchMaybe(url).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	/**
	 * Subscribes to a value as a boolean.
	 * @see watchValue
	 */
	public watchValueBoolean (
		url: string,
		defaultValue: () => boolean|Promise<boolean> = () => false
	) : Observable<{timestamp: number; value: boolean}> {
		return this.watchMaybeBoolean(url).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	/**
	 * Subscribes to a value as a number.
	 * @see watchValue
	 */
	public watchValueNumber (
		url: string,
		defaultValue: () => number|Promise<number> = () => 0
	) : Observable<{timestamp: number; value: number}> {
		return this.watchMaybeNumber(url).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	/**
	 * Subscribes to a value as an object.
	 * @see watchValue
	 */
	public watchValueObject<T> (
		url: string,
		proto: {decode: (bytes: Uint8Array) => T},
		defaultValue: () => T|Promise<T>
	) : Observable<{timestamp: number; value: T}> {
		return this.watchMaybeObject<T>(url, proto).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	/**
	 * Subscribes to a value as a string.
	 * @see watchValue
	 */
	public watchValueString (
		url: string,
		defaultValue: () => string|Promise<string> = () => ''
	) : Observable<{timestamp: number; value: string}> {
		return this.watchMaybeString(url).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	/**
	 * Subscribes to a value as a base64 data URI.
	 * @see watchValue
	 */
	public watchValueURI (
		url: string,
		defaultValue: () => string|Promise<string> = () => 'data:text/plain;base64,'
	) : Observable<{timestamp: number; value: string}> {
		return this.watchMaybeURI(url).flatMap(async o =>
			o || {timestamp: await util.timestamp(), value: await defaultValue()}
		);
	}

	constructor () {
		super();
	}
}
