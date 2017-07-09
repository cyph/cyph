import {IProto} from '../iproto';
import {BinaryProto} from '../protos';


/**
 * Base class for any service that manages data.
 */
export class DataManagerService {
	/** Gets an item's value. */
	public async getItem<T> (_URL: string, _PROTO: IProto<T>) : Promise<T> {
		throw new Error('Must provide an implementation of getItem.');
	}

	/** Checks whether an item exists. */
	public async hasItem (url: string) : Promise<boolean> {
		try {
			await this.getItem(url, BinaryProto);
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
	public async setItem<T> (_URL: string, _PROTO: IProto<T>, _VALUE: T) : Promise<{url: string}> {
		throw new Error('Must provide an implementation of setItem.');
	}

	constructor () {}
}
