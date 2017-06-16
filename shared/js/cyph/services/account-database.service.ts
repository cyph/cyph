import {Injectable} from '@angular/core';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';


/**
 * Account database service.
 */
@Injectable()
export class AccountDatabaseService {
	/**
	 * Gets an item's value.
	 * @param url Path to item.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public async getItem (url: string, publicData: boolean = false) : Promise<Uint8Array> {
		if (!this.accountAuthService.currentUserKeys) {
			throw new Error(`User not signed in. Cannot get item at ${url}.`);
		}

		const data	= await this.databaseService.getItem(url);

		return publicData ?
			this.potassiumService.fromString(
				await this.potassiumService.sign.open(
					data,
					this.accountAuthService.currentUserKeys.signingKeyPair.publicKey
				)
			) :
			await this.potassiumService.secretBox.open(
				data,
				this.accountAuthService.currentUserKeys.symmetricKey
			)
		;
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
		return this.databaseService.removeItem(url);
	}

	/**
	 * Sets an item's value.
	 * @param url Path to item.
	 * @param value Data to set.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 */
	public async setItem (
		url: string,
		value: ArrayBufferView|Blob|boolean|number|string,
		publicData: boolean = false
	) : Promise<void> {
		if (!this.accountAuthService.currentUserKeys) {
			throw new Error(`User not signed in. Cannot set item at ${url}.`);
		}

		const data	= (
			typeof value === 'boolean' ||
			typeof value === 'number' ||
			typeof value === 'string'
		) ?
			this.potassiumService.fromString(value.toString()) :
			value instanceof Blob ?
				await new Promise<Uint8Array>(resolve => {
					const reader	= new FileReader();
					reader.onload	= () => { resolve(new Uint8Array(reader.result)); };
					reader.readAsArrayBuffer(value);
				}) :
				new Uint8Array(value.buffer)
		;

		return this.databaseService.setItem(
			url,
			publicData ?
				await this.potassiumService.sign.sign(
					data,
					this.accountAuthService.currentUserKeys.signingKeyPair.privateKey
				) :
				await this.potassiumService.secretBox.seal(
					data,
					this.accountAuthService.currentUserKeys.symmetricKey
				)
		);
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
