import {Injectable} from '@angular/core';
import {PotassiumService} from './crypto/potassium.service';
import {LocalStorageService} from './local-storage.service';


/**
 * Account database service.
 */
@Injectable()
export class AccountDatabaseService {
	/** @ignore */
	private dummyKey (url: string, publicData: boolean) : string {
		return `${url}_${publicData.toString()}`;
	}

	/**
	 * Gets an item's value.
	 * @param url Path to item.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public async getItem (url: string, publicData: boolean = false) : Promise<Uint8Array> {
		const value	= await this.localStorageService.getItem(
			this.dummyKey(url, publicData)
		);

		if (value === undefined) {
			throw new Error(`Failed to get item at ${url}.`);
		}

		return this.potassiumService.fromString(value);
	}

	/**
	 * Deletes an item.
	 * @param url Path to item.
	 */
	public async removeItem (url: string) : Promise<void> {
		for (const publicData of [true, false]) {
			const success	= await this.localStorageService.removeItem(
				this.dummyKey(url, publicData)
			);

			if (success) {
				return;
			}
		}

		throw new Error(`Failed to remove item at ${url}.`);
	}

	/**
	 * Sets an item's value.
	 * @param url Path to item.
	 * @param value Data to set.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 */
	public async setItem (
		url: string,
		value: ArrayBuffer|boolean|number|string,
		publicData: boolean = false
	) : Promise<void> {
		const success	= await this.localStorageService.setItem(
			this.dummyKey(url, publicData),
			this.potassiumService.toString(value.toString())
		);

		if (!success) {
			throw new Error(`Failed to set item at ${url}.`);
		}
	}

	constructor (
		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
