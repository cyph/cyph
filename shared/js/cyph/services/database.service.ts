import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {util} from '../util';


/**
 * Provides online database and storage functionality.
 */
@Injectable()
export class DatabaseService {
	/** Returns a reference to a database object. */
	public async getDatabaseRef (_URL: string) : Promise<firebase.database.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getDatabaseRef.');
	}

	/** Gets a value. */
	public async getItem (_URL: string) : Promise<Uint8Array> {
		throw new Error('Must provide an implementation of DatabaseService.getItem.');
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (url: string) : Promise<boolean> {
		return (await this.getItemString(url)) === 'true';
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (url: string) : Promise<number> {
		return parseFloat(await this.getItemString(url));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (url: string) : Promise<T> {
		return util.parse<T>(await this.getItemString(url));
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (url: string) : Promise<string> {
		return potassiumUtil.toString(await this.getItem(url));
	}

	/** Returns a reference to a storage object. */
	public async getStorageRef (_URL: string) : Promise<firebase.storage.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getStorageRef.');
	}

	/** Logs in. */
	public async login (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.login.');
	}

	/** Logs out. */
	public async logout () : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.logout.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	/** Removes a value. */
	public async removeItem (_URL: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.removeItem.');
	}

	/** Sets a value. */
	public async setItem (
		_URL: string,
		_VALUE: ArrayBufferView|boolean|number|string
	) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.setItem.');
	}

	/** Sets an object value. */
	public async setItemObject<T> (url: string, value: T) : Promise<void> {
		return this.setItem(url, util.stringify(value));
	}

	constructor () {}
}
