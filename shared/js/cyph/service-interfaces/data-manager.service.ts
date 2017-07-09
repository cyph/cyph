import {DataType} from '../data-type';
import {IProto} from '../iproto';
import {util} from '../util';


/**
 * Base class for any service that manages data.
 */
export class DataManagerService {
	/** Gets an item's value. */
	public async getItem (_URL: string) : Promise<Uint8Array> {
		throw new Error('Must provide an implementation of getItem.');
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (url: string) : Promise<boolean> {
		return util.bytesToBoolean(await this.getItem(url));
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (url: string) : Promise<number> {
		return util.bytesToNumber(await this.getItem(url));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (url: string, proto: IProto<T>) : Promise<T> {
		return util.bytesToObject<T>(await this.getItem(url), proto);
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (url: string) : Promise<string> {
		return util.bytesToString(await this.getItem(url));
	}

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (url: string) : Promise<string> {
		return util.bytesToDataURI(await this.getItem(url));
	}

	/** Checks whether an item exists. */
	public async hasItem (url: string) : Promise<boolean> {
		try {
			await this.getItem(url);
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/** Deletes an item. */
	public async removeItem (_URL: string) : Promise<void> {
		throw new Error('Must provide an implementation of removeItem.');
	}

	/**
	 * Sets an item's value.
	 * @returns Item url.
	 */
	public async setItem<T = never> (_URL: string, _VALUE: DataType<T>) : Promise<{url: string}> {
		throw new Error('Must provide an implementation of setItem.');
	}

	constructor () {}
}
