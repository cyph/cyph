import {Injectable} from '@angular/core';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';
import {PotassiumService} from './crypto/potassium.service';
import {FileService} from './file.service';
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
	 * @param currentUserData If true, prepends the URL with users/${CURRENT_USERNAME}/.
	 */
	public async getItem (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<Uint8Array> {
		if (!this.accountAuthService.current) {
			throw new Error(`User not signed in. Cannot get item at ${url}.`);
		}

		if (currentUserData) {
			url	= `users/${this.accountAuthService.current.username}/${url}`;
		}

		const value	= await this.localStorageService.getItem(
			this.dummyKey(url, publicData)
		);

		if (value === undefined) {
			throw new Error(`Failed to get item at ${url}.`);
		}

		return this.potassiumService.fromBase64(value);
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<boolean> {
		return (await this.getItemString(url, publicData, currentUserData)) === 'true';
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<number> {
		return parseFloat(await this.getItemString(url, publicData, currentUserData));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<T> {
		return util.parse<T>(await this.getItemString(url, publicData, currentUserData));
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<string> {
		return this.potassiumService.toString(
			await this.getItem(url, publicData, currentUserData)
		);
	}

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (
		url: string,
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<string> {
		return 'data:application/octet-stream;base64,' + this.potassiumService.toBase64(
			await this.getItem(url, publicData, currentUserData)
		);
	}

	/**
	 * Deletes an item.
	 * @param url Path to item.
	 * @param currentUserData If true, prepends the URL with users/${CURRENT_USERNAME}/.
	 */
	public async removeItem (url: string, currentUserData: boolean = false) : Promise<void> {
		if (!this.accountAuthService.current) {
			throw new Error(`User not signed in. Cannot remove item at ${url}.`);
		}

		if (currentUserData) {
			url	= `users/${this.accountAuthService.current.username}/${url}`;
		}

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
	 * @param currentUserData If true, prepends the URL with users/${CURRENT_USERNAME}/.
	 */
	public async setItem (
		url: string,
		value: ArrayBuffer|ArrayBufferView|Blob|boolean|number|string|{[k: string]: any},
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<void> {
		if (!this.accountAuthService.current) {
			throw new Error(`User not signed in. Cannot set item at ${url}.`);
		}
		else if (typeof value === 'number' && isNaN(value)) {
			throw new Error(`Cannot set NaN as item value at ${url}.`);
		}

		if (currentUserData) {
			url	= `users/${this.accountAuthService.current.username}/${url}`;
		}

		const data	=
			value instanceof ArrayBuffer ?
				new Uint8Array(value) :
				ArrayBuffer.isView(value) ?
					new Uint8Array(value.buffer) :
					value instanceof Blob ?
						await this.fileService.getBytes(value, false) :
						this.potassiumService.fromString(
							(
								typeof value === 'boolean' ||
								typeof value === 'number' ||
								typeof value === 'string'
							) ?
								value.toString() :
								util.stringify(value)
						)
		;

		const success	= await this.localStorageService.setItem(
			this.dummyKey(url, publicData),
			this.potassiumService.toBase64(data)
		);

		if (!success) {
			throw new Error(`Failed to set item at ${url}.`);
		}
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
