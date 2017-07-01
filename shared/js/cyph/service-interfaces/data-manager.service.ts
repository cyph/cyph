import {DataType} from '../data-type';
import {util} from '../util';


/**
 * Base class for any service that manages data.
 */
export class DataManagerService {
	/** Gets an item's value. */
	public async getItem (_KEY: string) : Promise<Uint8Array> {
		throw new Error('Must provide an implementation of getItem.');
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (key: string) : Promise<boolean> {
		return util.bytesToBoolean(await this.getItem(key));
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (key: string) : Promise<number> {
		return util.bytesToNumber(await this.getItem(key));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (key: string) : Promise<T> {
		return util.bytesToObject<T>(await this.getItem(key));
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (key: string) : Promise<string> {
		return util.bytesToString(await this.getItem(key));
	}

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (key: string) : Promise<string> {
		return util.bytesToDataURI(await this.getItem(key));
	}

	/** Checks whether an item exists. */
	public async hasItem (key: string) : Promise<boolean> {
		try {
			await this.getItem(key);
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/** Deletes an item. */
	public async removeItem (_KEY: string) : Promise<void> {
		throw new Error('Must provide an implementation of removeItem.');
	}

	/**
	 * Sets an item's value.
	 * @returns Item key.
	 */
	public async setItem (_KEY: string, _VALUE: DataType) : Promise<string> {
		throw new Error('Must provide an implementation of setItem.');
	}

	constructor () {}
}
