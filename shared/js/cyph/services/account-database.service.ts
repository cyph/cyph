import {Injectable} from '@angular/core';
import {User} from '../account/user';
import {IKeyPair} from '../crypto/ikey-pair';
import {util} from '../util';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {FileService} from './file.service';


/**
 * Account database service.
 */
@Injectable()
export class AccountDatabaseService {
	/** Keys and profile of currently logged in user. Undefined if no user is signed in. */
	public current?: {
		keys: {
			encryptionKeyPair: IKeyPair;
			signingKeyPair: IKeyPair;
			symmetricKey: Uint8Array;
		};
		user: User;
	};

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
		if (currentUserData) {
			if (!this.current) {
				throw new Error(`User not signed in. Cannot get current user data at ${url}.`);
			}

			url	= `users/${this.current.user.username}/${url}`;
		}

		const data	= await this.databaseService.getItem(url);

		if (publicData) {
			return this.potassiumService.fromString(
				await this.potassiumService.sign.open(
					data,
					new Uint8Array([]) // this.current.keys.signingKeyPair.publicKey
				)
			);
		}
		else if (this.current) {
			return this.potassiumService.secretBox.open(
				data,
				this.current.keys.symmetricKey
			);
		}
		else {
			throw new Error(`User not signed in. Cannot get private data at ${url}.`);
		}
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
		if (!this.current) {
			throw new Error(`User not signed in. Cannot remove item at ${url}.`);
		}

		if (currentUserData) {
			url	= `users/${this.current.user.username}/${url}`;
		}

		return this.databaseService.removeItem(url);
	}

	/**
	 * Sets an item's value.
	 * @param url Path to item.
	 * @param value Data to set.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 * @param currentUserData If true, prepends the URL with users/${CURRENT_USERNAME}/.
	 * @returns Item URL.
	 */
	public async setItem (
		url: string,
		value: ArrayBuffer|ArrayBufferView|Blob|boolean|number|string|{[k: string]: any},
		publicData: boolean = false,
		currentUserData: boolean = false
	) : Promise<string> {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot set item at ${url}.`);
		}
		else if (typeof value === 'number' && isNaN(value)) {
			throw new Error(`Cannot set NaN as item value at ${url}.`);
		}

		if (currentUserData) {
			url	= `users/${this.current.user.username}/${url}`;
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

		await this.databaseService.setItem(
			url,
			publicData ?
				await this.potassiumService.sign.sign(
					data,
					this.current.keys.signingKeyPair.privateKey
				) :
				await this.potassiumService.secretBox.seal(
					data,
					this.current.keys.symmetricKey
				)
		);

		return url;
	}

	constructor (
		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
