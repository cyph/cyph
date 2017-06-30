import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {User} from '../account/user';
import {IKeyPair} from '../crypto/ikey-pair';
import {IPublicKeys} from '../crypto/ipublic-keys';
import {DataType} from '../data-type';
import {util} from '../util';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';


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

	/** @ignore */
	private getUsernameFromURL (url: string) : string {
		return (url.match(/\/?users\/(.*?)\//) || [])[1] || '';
	}

	/** @ignore */
	private async openPublicData (username: string, data: Uint8Array) : Promise<Uint8Array> {
		return this.potassiumService.sign.open(
			data,
			this.current && username === this.current.user.username ?
				this.current.keys.signingKeyPair.publicKey :
				(await this.getUserPublicKeys(username)).signing
		);
	}

	/** @ignore */
	private processURL (url: string) : string {
		if (url.match(/^\/?users/)) {
			return url;
		}
		if (!this.current) {
			throw new Error(`User not signed in. Cannot access current user data at ${url}.`);
		}

		return `users/${this.current.user.username}/${url}`;
	}

	/** @ignore */
	private async setItemInternal (
		url: string,
		value: DataType,
		publicData: boolean,
		operation: string,
		setItem: (url: string, value: Uint8Array) => Promise<string>
	) : Promise<string> {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot ${operation} item at ${url}.`);
		}
		else if (typeof value === 'number' && isNaN(value)) {
			throw new Error(`Cannot ${operation} NaN as item value at ${url}.`);
		}

		url	= this.processURL(url);

		const data	= await util.toBytes(value);

		return setItem(
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
	}

	/**
	 * Gets an item's value.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public async getItem (url: string, publicData: boolean = false) : Promise<Uint8Array> {
		url	= this.processURL(url);

		const data	= await this.databaseService.getItem(url);

		if (publicData) {
			return this.openPublicData(this.getUsernameFromURL(url), data);
		}
		else if (this.current) {
			return this.potassiumService.secretBox.open(data, this.current.keys.symmetricKey);
		}
		else {
			throw new Error(`User not signed in. Cannot get private data at ${url}.`);
		}
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (url: string, publicData: boolean = false) : Promise<boolean> {
		return (await this.getItem(url, publicData))[0] === 1;
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (url: string, publicData: boolean = false) : Promise<number> {
		const data	= await this.getItem(url, publicData);
		return new DataView(data.buffer, data.byteOffset).getFloat64(0, true);
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

	/** Checks whether an item exists. */
	public async hasItem (url: string) : Promise<boolean> {
		return this.databaseService.hasItem(url);
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		if (!this.current) {
			throw new Error('User not signed in. Cannot lock.');
		}

		return this.databaseService.lock(`users/${this.current.user.username}/lock`, f, reason);
	}

	/**
	 * Pushes an item to a list.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 * @returns Item URL.
	 */
	public async pushItem (
		url: string,
		value: DataType,
		publicData: boolean = false
	) : Promise<string> {
		return this.setItemInternal(
			url,
			value,
			publicData,
			'push',
			async (u, v) => this.databaseService.pushItem(u, v)
		);
	}

	/** Deletes an item. */
	public async removeItem (url: string) : Promise<void> {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot remove item at ${url}.`);
		}

		url	= this.processURL(url);

		return this.databaseService.removeItem(url);
	}

	/**
	 * Sets an item's value.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 * @returns Item URL.
	 */
	public async setItem (
		url: string,
		value: DataType,
		publicData: boolean = false
	) : Promise<string> {
		return this.setItemInternal(
			url,
			value,
			publicData,
			'set',
			async (u, v) => this.databaseService.setItem(u, v)
		);
	}

	/** Subscribes to value. */
	public watchItem (
		url: string,
		publicData: boolean = false
	) : Observable<Uint8Array|undefined> {
		url	= this.processURL(url);

		if (publicData) {
			const username	= this.getUsernameFromURL(url);

			return this.databaseService.watchItem(url).flatMap(async data =>
				data ? this.openPublicData(username, data) : undefined
			);
		}
		else if (this.current) {
			const symmetricKey	= this.current.keys.symmetricKey;

			return this.databaseService.watchItem(url).flatMap(async data =>
				data ? this.potassiumService.secretBox.open(data, symmetricKey) : undefined
			);
		}
		else {
			throw new Error(`User not signed in. Cannot watch private data at ${url}.`);
		}
	}

	/**
	 * Subscribes to a value as a boolean.
	 * @see watchItem
	 */
	public watchItemBoolean (
		url: string,
		publicData: boolean = false
	) : Observable<boolean|undefined> {
		return this.watchItem(url, publicData).map(value =>
			value === undefined ? undefined : value[0] === 1
		);
	}

	/**
	 * Subscribes to a value as a number.
	 * @see watchItem
	 */
	public watchItemNumber (
		url: string,
		publicData: boolean = false
	) : Observable<number|undefined> {
		return this.watchItem(url, publicData).map(value =>
			value === undefined ?
				undefined :
				new DataView(value.buffer, value.byteOffset).getFloat64(0, true)
		);
	}

	/**
	 * Subscribes to a value as an object.
	 * @see watchItem
	 */
	public watchItemObject<T> (
		url: string,
		publicData: boolean = false
	) : Observable<T|undefined> {
		return this.watchItemString(url, publicData).map(value =>
			value === undefined ? undefined : util.parse<T>(value)
		);
	}

	/**
	 * Subscribes to a value as a string.
	 * @see watchItem
	 */
	public watchItemString (
		url: string,
		publicData: boolean = false
	) : Observable<string|undefined> {
		return this.watchItem(url, publicData).map(value =>
			value === undefined ? undefined : this.potassiumService.toString(value)
		);
	}

	/**
	 * Subscribes to a value as a base64 data URI.
	 * @see watchItem
	 */
	public watchItemURI (
		url: string,
		publicData: boolean = false
	) : Observable<string|undefined> {
		return this.watchItem(url, publicData).map(value =>
			value === undefined ?
				undefined :
				'data:application/octet-stream;base64,' + this.potassiumService.toBase64(value)
		);
	}

	/** Subscribes to a list of values. */
	public watchList<T = Uint8Array> (
		url: string,
		publicData: boolean = false,
		mapper: (value: Uint8Array) => T = (value: Uint8Array&T) => value
	) : Observable<T[]> {
		url	= this.processURL(url);

		if (publicData) {
			const username	= this.getUsernameFromURL(url);

			return this.databaseService.watchList<T>(url, async data =>
				mapper(await this.openPublicData(username, data))
			);
		}
		else if (this.current) {
			const symmetricKey	= this.current.keys.symmetricKey;

			return this.databaseService.watchList<T>(url, async data =>
				mapper(await this.potassiumService.secretBox.open(data, symmetricKey))
			);
		}
		else {
			throw new Error(`User not signed in. Cannot watch private data list at ${url}.`);
		}
	}

	/**
	 * Subscribes to a list of values as booleans.
	 * @see watchList
	 */
	public watchListBoolean (url: string, publicData: boolean = false) : Observable<boolean[]> {
		return this.watchList<boolean>(
			url,
			publicData,
			value => value[0] === 1
		);
	}

	/**
	 * Subscribes to a list of values as numbers.
	 * @see watchList
	 */
	public watchListNumber (url: string, publicData: boolean = false) : Observable<number[]> {
		return this.watchList<number>(
			url,
			publicData,
			value => new DataView(value.buffer, value.byteOffset).getFloat64(0, true)
		);
	}

	/**
	 * Subscribes to a list of values as objects.
	 * @see watchList
	 */
	public watchListObject<T> (url: string, publicData: boolean = false) : Observable<T[]> {
		return this.watchList<T>(
			url,
			publicData,
			value => util.parse<T>(this.potassiumService.toString(value))
		);
	}

	/**
	 * Subscribes to a list of values as strings.
	 * @see watchList
	 */
	public watchListString (url: string, publicData: boolean = false) : Observable<string[]> {
		return this.watchList<string>(
			url,
			publicData,
			value => this.potassiumService.toString(value)
		);
	}

	/**
	 * Subscribes to a list of values as base64 data URIs.
	 * @see watchList
	 */
	public watchListURI (url: string, publicData: boolean = false) : Observable<string[]> {
		return this.watchList<string>(
			url,
			publicData,
			value =>
				'data:application/octet-stream;base64,' +
				this.potassiumService.toBase64(value)
		);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
