import {Injectable} from '@angular/core';
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
		value: ArrayBufferView|boolean|number|string,
		publicData: boolean = false
	) : Promise<void> {
		if (!this.accountAuthService.currentUserKeys) {
			throw new Error(`User not signed in. Cannot set item at ${url}.`);
		}

		const data	= this.potassiumService.fromString(
			(typeof value === 'boolean' || typeof value === 'number') ?
				value.toString() :
				value
		);

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
