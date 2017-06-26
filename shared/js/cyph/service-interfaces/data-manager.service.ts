import {potassiumUtil} from '../crypto/potassium/potassium-util';
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

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (url: string) : Promise<string> {
		return 'data:application/octet-stream;base64,' + potassiumUtil.toBase64(
			await this.getItem(url)
		);
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

	/** Sets an item's value. */
	public async setItem (_KEY: string, _VALUE: DataType) : Promise<void> {
		throw new Error('Must provide an implementation of setItem.');
	}

	constructor () {}
}
