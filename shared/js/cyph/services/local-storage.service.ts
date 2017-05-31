import {Injectable} from '@angular/core';


/**
 * Provides local storage functionality.
 */
@Injectable()
export class LocalStorageService {
	/** Gets an item's value. */
	public async getItem (key: string) : Promise<string|undefined> {
		try {
			/* tslint:disable-next-line:ban */
			const value	= localStorage.getItem(key);
			if (typeof value === 'string') {
				return value;
			}
		}
		catch (_) {}

		return;
	}

	/**
	 * Deletes an item.
	 * @returns Success status.
	 */
	public async removeItem (key: string) : Promise<boolean> {
		try {
			/* tslint:disable-next-line:ban */
			localStorage.removeItem(key);
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/**
	 * Sets an item's value.
	 * @returns Success status.
	 */
	public async setItem (key: string, value: boolean|number|string) : Promise<boolean> {
		try {
			/* tslint:disable-next-line:ban */
			localStorage.setItem(key, value.toString());
			return true;
		}
		catch (_) {
			return false;
		}
	}

	constructor () {}
}
