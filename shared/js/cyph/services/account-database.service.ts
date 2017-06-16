import {Injectable} from '@angular/core';
import {util} from '../util';
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

		return this.potassiumService.fromBase64(value);
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (url: string, publicData: boolean = false) : Promise<boolean> {
		return (await this.getItemString(url, publicData)) === 'true';
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (url: string, publicData: boolean = false) : Promise<number> {
		return parseFloat(await this.getItemString(url, publicData));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (url: string, publicData: boolean = false) : Promise<T> {
		return util.parse<T>(await this.getItemString(url, publicData));
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (url: string, publicData: boolean = false) : Promise<string> {
		return this.potassiumService.toString(await this.getItem(url, publicData));
	}

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (url: string, publicData: boolean = false) : Promise<string> {
		return 'data:application/octet-stream;base64,' + this.potassiumService.toBase64(
			await this.getItem(url, publicData)
		);
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
	public async setItem<T> (
		url: string,
		value: ArrayBufferView|Blob|boolean|number|string|T,
		publicData: boolean = false
	) : Promise<void> {
		if (value === undefined || value === null) {
			throw new Error(`Cannot set undefined item value at ${url}.`);
		}
		else if (value === NaN) {
			throw new Error(`Cannot set NaN as item value at ${url}.`);
		}

		const data	=
			ArrayBuffer.isView(value) ?
				new Uint8Array(value.buffer) :
				value instanceof ArrayBuffer ?
					new Uint8Array(value) :
					value instanceof Blob ?
						await new Promise<Uint8Array>(resolve => {
							const reader	= new FileReader();
							reader.onload	= () => { resolve(new Uint8Array(reader.result)); };
							reader.readAsArrayBuffer(value);
						}) :
						this.potassiumService.fromString(
							(
								typeof value === 'boolean' ||
								typeof value === 'number' ||
								typeof value === 'string'
							) ?
								value.toString() :
								util.stringify<T>(value)
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
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
