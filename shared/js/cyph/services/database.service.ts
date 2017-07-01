import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import {Observable} from 'rxjs';
import {DataType} from '../data-type';
import {DataManagerService} from '../service-interfaces/data-manager.service';
import {util} from '../util';


/**
 * Provides online database and storage functionality.
 */
@Injectable()
export class DatabaseService extends DataManagerService {
	/** Returns a reference to a database object. */
	public async getDatabaseRef (_URL: string) : Promise<firebase.database.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getDatabaseRef.');
	}

	/** Returns a reference to a storage object. */
	public async getStorageRef (_URL: string) : Promise<firebase.storage.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getStorageRef.');
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (
		_URL: string,
		_F: (reason?: string) => Promise<T>,
		_REASON?: string
	) : Promise<T> {
		throw new Error('Must provide an implementation of DatabaseService.lock.');
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
	public async pushItem (_URL: string, _VALUE: DataType) : Promise<string> {
		throw new Error('Must provide an implementation of DatabaseService.pushItem.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	/** Returns value representing the database server's timestamp. */
	public async timestamp () : Promise<any> {
		return util.timestamp();
	}

	/** Subscribes to value. */
	public watchItem (_URL: string) : Observable<Uint8Array|undefined> {
		throw new Error('Must provide an implementation of DatabaseService.watchItem.');
	}

	/**
	 * Subscribes to a value as a boolean.
	 * @see watchItem
	 */
	public watchItemBoolean (url: string) : Observable<boolean|undefined> {
		return this.watchItem(url).map(value =>
			value === undefined ? undefined : util.bytesToBoolean(value)
		);
	}

	/**
	 * Subscribes to a value as a number.
	 * @see watchItem
	 */
	public watchItemNumber (url: string) : Observable<number|undefined> {
		return this.watchItem(url).map(value =>
			value === undefined ? undefined : util.bytesToNumber(value)
		);
	}

	/**
	 * Subscribes to a value as an object.
	 * @see watchItem
	 */
	public watchItemObject<T> (url: string) : Observable<T|undefined> {
		return this.watchItem(url).map(value =>
			value === undefined ? undefined : util.bytesToObject<T>(value)
		);
	}

	/**
	 * Subscribes to a value as a string.
	 * @see watchItem
	 */
	public watchItemString (url: string) : Observable<string|undefined> {
		return this.watchItem(url).map(value =>
			value === undefined ? undefined : util.bytesToString(value)
		);
	}

	/**
	 * Subscribes to a value as a base64 data URI.
	 * @see watchItem
	 */
	public watchItemURI (url: string) : Observable<string|undefined> {
		return this.watchItem(url).map(value =>
			value === undefined ? undefined : util.bytesToDataURI(value)
		);
	}

	/** Subscribes to a list of values. */
	public watchList<T = Uint8Array> (
		_URL: string,
		_MAPPER?: (value: Uint8Array) => T|Promise<T>
	) : Observable<T[]> {
		throw new Error('Must provide an implementation of DatabaseService.watchList.');
	}

	/**
	 * Subscribes to a list of values as booleans.
	 * @see watchList
	 */
	public watchListBoolean (url: string) : Observable<boolean[]> {
		return this.watchList<boolean>(url, value => util.bytesToBoolean(value));
	}

	/**
	 * Subscribes to a list of values as numbers.
	 * @see watchList
	 */
	public watchListNumber (url: string) : Observable<number[]> {
		return this.watchList<number>(url, value => util.bytesToNumber(value));
	}

	/**
	 * Subscribes to a list of values as objects.
	 * @see watchList
	 */
	public watchListObject<T> (url: string) : Observable<T[]> {
		return this.watchList<T>(url, value => util.bytesToObject<T>(value));
	}

	/**
	 * Subscribes to a list of values as strings.
	 * @see watchList
	 */
	public watchListString (url: string) : Observable<string[]> {
		return this.watchList<string>(url, value => util.bytesToString(value));
	}

	/**
	 * Subscribes to a list of values as base64 data URIs.
	 * @see watchList
	 */
	public watchListURI (url: string) : Observable<string[]> {
		return this.watchList<string>(url, value => util.bytesToDataURI(value));
	}

	constructor () {
		super();
	}
}
