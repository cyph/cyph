import {Injectable} from '@angular/core';
import {User} from '../account/user';
import {IKeyPair} from '../crypto/ikey-pair';
import {IPublicKeys} from '../crypto/ipublic-keys';
import {util} from '../util';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {FileService} from './file.service';


/**
 * Account database service.
 */
@Injectable()
export class AccountDatabaseService {
	/** Public keys for AGSE-PKI certificate validation. */
	private readonly agsePublicSigningKeys	= {
		rsa: [
			'eyJhbGciOiJSUzI1NiIsImUiOiJBUUFCIiwiZXh0Ijp0cnVlLCJrZXlfb3BzIjpbInZlcmlmeSJ' +
			'dLCJrdHkiOiJSU0EiLCJuIjoidkVUOG1HY24zcWFyN1FfaXo1MVZjUmNKdHRFSG5VcWNmN1VybT' +
			'Vueko4bG80Q2RjQTZLN2dRMDl6bmx4a3NQLTg1RE1NSGdwU29mcU1BY2l6UTVmNW5McGxydEtJX' +
			'0dtdFJ1T1k2d3RHZnZLcjNNX3pWMGxVYVFKSXEyVmg0aTU0ZHo1akp6QTZwWmp4eU91V01VdnJm' +
			'SXZrWVg5LUl2MTBxMTEwYm9waGNmRGpNVTFQbTNZeUlVQzhjSEk2TmN0ZGVOV3dzTEg2WkgwbVd' +
			'QYTgxZUw2bWtyVzBUZkt1Q1ZEaDBFckVCWkJJUUx5TmV1dF9jb2JxR0NoS0V6Y0xVMll6MUUwR1' +
			'9DbkRLVHVYVG5nNEVUQ0FYakhDUXJwaUp1aV81UG9SUGdhT0xvcEdKV0RmQXkxMF8yX3ZIeGxab' +
			'3hrNWFxREx2Z3B3Ny1fdHVTNWRzNmlRIn0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
		],
		sphincs: [
			'z3ztlxR0wvt9oW3zvjSF74ugJKbzCpJ0yHEeUdFiPIiBMZ3zcOu0N4M9adTCvdDQBefFNUSVeFFk' +
			'7lNUfAPNdIV63DMwYS2hPoSM0q1psU0o9ba0M/vrW51Qkkgh8+U4e0sGtHq3Nrb7Gp+KTo5OB7On' +
			'SAaudHT/hR3oSj85JdjZ0QhN4iHAJvhujUHceNbLJY/c50YSRlnG/12hc5yxeaslUCvYyYPcXneL' +
			'Kr3bINmeFkfr9/Lirxkr9AYiN3c4/s4D45MU1XpKY/u9Ar4zil+ejkIokTPVhwGZH6RoSI0j1WX/' +
			'1MxOIwTBafQ+vSiamDPik9c1nHZMh7Cr573IY0WePSi5qQuY6hbgyyq0qm8+FealryFZAqYQf2kd' +
			'T8RxzCSnQtQmiisLkqdi/glDiPxi5xs1jSBRUqBv+oaaQAYME2tHdzBqG2V6yz9olOLzzQLAsyhe' +
			'aoW9C45G4s5ws3eU4CipA3M/rVflgOXyXID8U5t+u+kE3Ncy3b6GSX92bumgqtoaUYRCCN4/TOAB' +
			'EpMTn/5dlugoyJVDxq986d+oQaGEFQfdkpBybaq9lQZQaUIqwTX26okpmLpvau3s+ENdo76ZxSkK' +
			'IG8HjP3P0SSLnS3u7aMvm4JW8lI7UG5t38M+5bS5XNUumJdWiWQf6Ay4dDBuaybu7roS8LgTvbfo' +
			'CLWEUkNT3LmCXYw//+nG6pB0W780ejV9TE0xIIRZ+XzQ8oFNTceJWsbGOgli5IBZh+40LL02TZC9' +
			'Eo/TFCSNtekG8I2NyZnfP+aeZvOvSW+I95onFjnkRd/KxntSobRTGBPLfJS/UaLAEMnyh9NoPIHi' +
			'6yUw5QVp7kYYY+slgT66g80GBVj5z1LxBpgsmWIKNnhqbf13qo24C3S+8rf8GAbdSdET9ObarpmA' +
			'IXjl9Nl7CWL+ZVfFvYrRkKzYHMGIYKnIzj/LHs3pn17yHW+AiN2SEpjUuSnd471+mOqwjmzvfsS4' +
			'HoN0ehv2cbhc1b+rHaO3thuwemHzS1w1AS9qHOPdFMZ+3wnsqDD16O+yPy5yF060xcdIJkryfMqJ' +
			'3I9lJfpd2HCLfaHSIYe+KEMJgUhieWahozYDiVX8Y3UVD8wTaC/rrkSq3tNh4k9Qh3qku+QQdzRj' +
			'/YOeX3tt57DSQEt0/GP3bwXDt1wlaIogeNW93VWXdVpLlt50fom9mf0yMcS4IuXT3qNiMRPjkbTo' +
			'TfODamHnu9vu/sd/4c6N3soJMJC7e+nIBJWqAgBczXMaTgUb2CsXTB92wf5syOLZNxQqjh073vkT' +
			'6vQwJ9qYu6ad0carC5esAfgiNY/7ayolQObwd/7wbGGYV1QFCJYs6NCjUTst/DH8KyI8Piw7aknq' +
			'uqxj7+blqIEewEPKEx1mBKgvDLzGgIoEx3azc/nk'
		]
	};

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
			const username	= (url.match(/\/?users\/(.*?)\//) || [])[1] || '';

			return this.potassiumService.fromString(
				await this.potassiumService.sign.open(
					data,
					this.current && username === this.current.user.username ?
						this.current.keys.signingKeyPair.publicKey :
						(await this.getUserPublicKeys(username)).signing
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

	/** Tries to to get public keys belonging to the specified user. */
	public async getUserPublicKeys (username: string) : Promise<IPublicKeys> {
		const certificate	= await this.databaseService.getItem(`users/${username}/certificate`);
		const dataView		= new DataView(certificate.buffer);

		const rsaKeyIndex		= dataView.getUint32(0, true);
		const sphincsKeyIndex	= dataView.getUint32(4, true);
		const signed			= new Uint8Array(certificate.buffer, 8);

		if (
			rsaKeyIndex >= this.agsePublicSigningKeys.rsa.length ||
			sphincsKeyIndex >= this.agsePublicSigningKeys.sphincs.length
		) {
			throw new Error('Invalid AGSE-PKI certificate: bad key index.');
		}

		const verified	= util.parse<{
			publicEncryptionKey: string;
			publicSigningKey: string;
			username: string;
		}>(
			this.potassiumService.toString(
				await this.potassiumService.sign.open(
					signed,
					await this.potassiumService.sign.importSuperSphincsPublicKeys(
						this.agsePublicSigningKeys.rsa[rsaKeyIndex],
						this.agsePublicSigningKeys.sphincs[sphincsKeyIndex]
					)
				)
			)
		);

		if (verified.username !== username) {
			throw new Error('Invalid AGSE-PKI certificate: bad username.');
		}

		return {
			encryption: this.potassiumService.fromBase64(verified.publicEncryptionKey),
			signing: this.potassiumService.fromBase64(verified.publicSigningKey)
		};
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
