import {Injectable} from '@angular/core';
import {SecureStorage} from 'nativescript-secure-storage';
import {LocalStorageService} from './js/cyph/services/local-storage.service';


/**
 * Provides local storage functionality for native app.
 */
@Injectable()
export class NativeLocalStorageService implements LocalStorageService {
	/** @ignore */
	private readonly storage: SecureStorage	= new SecureStorage();

	/** Gets an item's value. */
	public async getItem (key: string) : Promise<string|undefined> {
		try {
			const value	= await this.storage.get({key});
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
		return this.storage.remove({key}).catch(() => false);
	}

	/**
	 * Sets an item's value.
	 * @returns Success status.
	 */
	public async setItem (key: string, value: boolean|number|string) : Promise<boolean> {
		return this.storage.set({key, value: value.toString()}).catch(() => false);
	}

	constructor () {}
}
