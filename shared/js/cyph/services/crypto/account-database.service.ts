/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {memoize} from 'lodash';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../../account/user';
import {IKeyPair} from '../../crypto/ikey-pair';
import {IPublicKeys} from '../../crypto/ipublic-keys';
import {DataType} from '../../data-type';
import {IAsyncValue} from '../../iasync-value';
import {LockFunction} from '../../lock-function-type';
import {Proto} from '../../proto-type';
import {util} from '../../util';
import {DatabaseService} from '../database.service';
import {PotassiumService} from './potassium.service';


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
	private async getItemInternal (url: string, publicData: boolean, operation: string) : Promise<{
		progress: Observable<number>;
		result: {
			timestamp: number;
			value: Uint8Array;
		};
	}> {
		await this.waitForUnlock(url);

		url	= this.processURL(url);

		const data	= this.databaseService.downloadItem(url);
		let result	= await data.result;

		if (publicData) {
			result	= {
				timestamp: result.timestamp,
				value: await this.openPublicData(
					this.getUsernameFromURL(url),
					result.value
				)
			};
		}
		else if (this.current) {
			result	= {
				timestamp: result.timestamp,
				value: await this.potassiumService.secretBox.open(
					result.value,
					this.current.keys.symmetricKey
				)
			};
		}
		else {
			throw new Error(`User not signed in. Cannot ${operation} private data at ${url}.`);
		}

		return {progress: data.progress, result};
	}

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
	private processLockURL (url: string) : string {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot access current user lock at ${url}.`);
		}

		return this.processURL(url).replace(
			`users/${this.current.user.username}/`,
			`users/${this.current.user.username}/locks/`
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
	private async setItemInternal<T, DT = never> (
		url: string,
		value: DataType<DT>,
		publicData: boolean,
		operation: string,
		setItem: (url: string, value: Uint8Array) => Promise<T>
	) : Promise<T> {
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
	 * Downloads value and gives progress.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public downloadItem (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: Uint8Array}>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const downloadTask	= await this.getItemInternal(url, publicData, 'download');

			downloadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return downloadTask.result;
		})();

		return {progress, result};
	}

	/**
	 * Downloads a value as a boolean.
	 * @see downloadItem
	 */
	public downloadItemBoolean (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: boolean}>;
	} {
		const {progress, result}	= this.downloadItem(url, publicData);

		return {
			progress,
			result: result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToBoolean(value)
			}))
		};
	}

	/**
	 * Downloads a value as a number.
	 * @see downloadItem
	 */
	public downloadItemNumber (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: number}>;
	} {
		const {progress, result}	= this.downloadItem(url, publicData);

		return {
			progress,
			result: result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToNumber(value)
			}))
		};
	}

	/**
	 * Downloads a value as an object.
	 * @see downloadItem
	 */
	public downloadItemObject<T> (url: string, proto: Proto<T>, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: T}>;
	} {
		const {progress, result}	= this.downloadItem(url, publicData);

		return {
			progress,
			result: result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToObject<T>(value, proto)
			}))
		};
	}

	/**
	 * Downloads a value as a string.
	 * @see downloadItem
	 */
	public downloadItemString (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: string}>;
	} {
		const {progress, result}	= this.downloadItem(url, publicData);

		return {
			progress,
			result: result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToString(value)
			}))
		};
	}

	/**
	 * Downloads a value as a base64 data URI.
	 * @see downloadItem
	 */
	public downloadItemURI (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<{timestamp: number; value: string}>;
	} {
		const {progress, result}	= this.downloadItem(url, publicData);

		return {
			progress,
			result: result.then(({timestamp, value}) => ({
				timestamp,
				value: util.bytesToDataURI(value)
			}))
		};
	}

	/**
	 * Gets an IAsyncValue wrapper for an item.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 * @param defaultValue If item isn't already set, will be used to initialize it.
	 */
	public getAsyncValue (
		url: string,
		publicData: boolean = false,
		defaultValue: () => Uint8Array|Promise<Uint8Array> = () => new Uint8Array([])
	) : IAsyncValue<Uint8Array> {
		let currentHash: string|undefined;
		let currentValue: Uint8Array|undefined;

		const localLock	= util.lockFunction();

		const asyncValue: IAsyncValue<Uint8Array>	= {
			getValue: async () => localLock(async () : Promise<Uint8Array> => {
				await this.waitForUnlock(url);

				const {hash}	= await this.databaseService.getMetadata(url);

				/* tslint:disable-next-line:possible-timing-attack */
				if (currentValue && currentHash === hash) {
					return currentValue;
				}
				else if (currentValue) {
					this.potassiumService.clearMemory(currentValue);
					currentValue	= undefined;
				}

				const value	= await this.getItem(url, publicData);

				/* tslint:disable-next-line:possible-timing-attack */
				if (hash !== (await this.databaseService.getMetadata(url)).hash) {
					return asyncValue.getValue();
				}

				currentHash		= hash;
				currentValue	= value;

				return currentValue;
			}),
			lock: this.lockFunction(url),
			setValue: async (value: Uint8Array) => localLock(async () => {
				const oldValue	= currentValue;

				currentHash		= (await this.setItem(url, value, publicData)).hash;
				currentValue	= value;

				if (oldValue) {
					this.potassiumService.clearMemory(oldValue);
				}
			}),
			updateValue: async f => asyncValue.lock(async () => {
				const value	= await asyncValue.getValue();
				let newValue: Uint8Array;
				try {
					newValue	= await f(value);
				}
				catch (_) {
					return;
				}
				asyncValue.setValue(newValue);
			}),
			watch: memoize(() =>
				this.watchValue(url, publicData, defaultValue).map(o => o.value)
			)
		};

		localLock(async () => {
			if (!(await this.hasItem(url))) {
				await this.setItem(url, await defaultValue());
			}
		});

		return asyncValue;
	}

	/**
	 * Gets an async value as a boolean.
	 * @see getAsyncValue
	 */
	public getAsyncValueBoolean (
		url: string,
		publicData: boolean = false,
		defaultValue: () => boolean|Promise<boolean> = () => false
	) : IAsyncValue<boolean> {
		const {getValue, lock, setValue, updateValue}	= this.getAsyncValue(
			url,
			publicData,
			async () => util.toBytes(await defaultValue())
		);

		return {
			getValue: async () => util.bytesToBoolean(await getValue()),
			lock,
			setValue: async value => setValue(await util.toBytes(value)),
			updateValue: async f => updateValue(
				async value => util.toBytes(await f(util.bytesToBoolean(value)))
			),
			watch: memoize(
				() => this.watchValueBoolean(url, publicData, defaultValue).map(o => o.value)
			)
		};
	}

	/**
	 * Gets an async value as a number.
	 * @see getAsyncValue
	 */
	public getAsyncValueNumber (
		url: string,
		publicData: boolean = false,
		defaultValue: () => number|Promise<number> = () => 0
	) : IAsyncValue<number> {
		const {getValue, lock, setValue, updateValue}	= this.getAsyncValue(
			url,
			publicData,
			async () => util.toBytes(await defaultValue())
		);

		return {
			getValue: async () => util.bytesToNumber(await getValue()),
			lock,
			setValue: async value => setValue(await util.toBytes(value)),
			updateValue: async f => updateValue(
				async value => util.toBytes(await f(util.bytesToNumber(value)))
			),
			watch: memoize(
				() => this.watchValueNumber(url, publicData, defaultValue).map(o => o.value)
			)
		};
	}

	/**
	 * Gets an async value as an object.
	 * @see getAsyncValue
	 */
	public getAsyncValueObject<T> (
		url: string,
		proto: Proto<T>,
		defaultValue: () => T|Promise<T>,
		publicData: boolean = false
	) : IAsyncValue<T> {
		const {getValue, lock, setValue, updateValue}	= this.getAsyncValue(
			url,
			publicData,
			async () => util.toBytes({data: await defaultValue(), proto})
		);

		return {
			getValue: async () => util.bytesToObject<T>(await getValue(), proto),
			lock,
			setValue: async value => setValue(await util.toBytes({data: value, proto})),
			updateValue: async f => updateValue(
				async value => util.toBytes({
					data: await f(util.bytesToObject<T>(value, proto)),
					proto
				})
			),
			watch: memoize(
				() => this.watchValueObject<T>(url, proto, defaultValue, publicData).map(o => o.value)
			)
		};
	}

	/**
	 * Gets an async value as a string.
	 * @see getAsyncValue
	 */
	public getAsyncValueString (
		url: string,
		publicData: boolean = false,
		defaultValue: () => string|Promise<string> = () => ''
	) : IAsyncValue<string> {
		const {getValue, lock, setValue, updateValue}	= this.getAsyncValue(
			url,
			publicData,
			async () => util.toBytes(await defaultValue())
		);

		return {
			getValue: async () => util.bytesToString(await getValue()),
			lock,
			setValue: async value => setValue(await util.toBytes(value)),
			updateValue: async f => updateValue(
				async value => util.toBytes(await f(util.bytesToString(value)))
			),
			watch: memoize(
				() => this.watchValueString(url, publicData, defaultValue).map(o => o.value)
			)
		};
	}

	/**
	 * Gets an async value as a base64 data URI.
	 * @see getAsyncValue
	 */
	public getAsyncValueURI (
		url: string,
		publicData: boolean = false,
		defaultValue: () => string|Promise<string> = () => 'data:text/plain;base64,'
	) : IAsyncValue<string> {
		const {getValue, lock, setValue, updateValue}	= this.getAsyncValue(
			url,
			publicData,
			async () => util.toBytes(await defaultValue())
		);

		return {
			getValue: async () => util.bytesToDataURI(await getValue()),
			lock,
			setValue: async value => setValue(await util.toBytes(value)),
			updateValue: async f => updateValue(
				async value => util.toBytes(await f(util.bytesToDataURI(value)))
			),
			watch: memoize(
				() => this.watchValueURI(url, publicData, defaultValue).map(o => o.value)
			)
		};
	}

	/**
	 * Gets an item's value.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public async getItem (url: string, publicData: boolean = false) : Promise<Uint8Array> {
		return (await (await this.getItemInternal(url, publicData, 'get')).result).value;
	}

	/**
	 * Gets a value as a boolean.
	 * @see getItem
	 */
	public async getItemBoolean (url: string, publicData: boolean = false) : Promise<boolean> {
		return util.bytesToBoolean(await this.getItem(url, publicData));
	}

	/**
	 * Gets a value as a number.
	 * @see getItem
	 */
	public async getItemNumber (url: string, publicData: boolean = false) : Promise<number> {
		return util.bytesToNumber(await this.getItem(url, publicData));
	}

	/**
	 * Gets a value as an object.
	 * @see getItem
	 */
	public async getItemObject<T> (
		url: string,
		proto: Proto<T>,
		publicData: boolean = false
	) : Promise<T> {
		return util.bytesToObject<T>(await this.getItem(url, publicData), proto);
	}

	/**
	 * Gets a value as a string.
	 * @see getItem
	 */
	public async getItemString (url: string, publicData: boolean = false) : Promise<string> {
		return util.bytesToString(await this.getItem(url, publicData));
	}

	/**
	 * Gets a value as a base64 data URI.
	 * @see getItem
	 */
	public async getItemURI (url: string, publicData: boolean = false) : Promise<string> {
		return util.bytesToDataURI(await this.getItem(url, publicData));
	}

	/**
	 * Gets an async value that may be undefined.
	 * @see getAsyncValue
	 */
	public getMaybeAsyncValue (
		url: string,
		publicData: boolean = false
	) : IAsyncValue<Uint8Array|undefined> {
		const {getValue, lock, setValue}	=
			this.getAsyncValue(url, publicData)
		;

		const localLock	= util.lockFunction();

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const maybeAsyncValue: IAsyncValue<Uint8Array|undefined>	= {
			getValue: async () => localLock(async () => {
				await this.waitForUnlock(url);
				if (!(await this.hasItem(url))) {
					return;
				}
				return getValue();
			}),
			lock,
			setValue: async value => localLock(async () => {
				if (value) {
					await setValue(value);
				}
				else {
					await this.removeItem(url);
				}
			}),
			updateValue: async f => maybeAsyncValue.lock(async () => {
				const value	= await maybeAsyncValue.getValue();
				let newValue: Uint8Array|undefined;
				try {
					newValue	= await f(value);
				}
				catch (_) {
					return;
				}
				if (newValue) {
					maybeAsyncValue.setValue(newValue);
				}
				else {
					await this.removeItem(url);
				}
			}),
			watch: memoize(() => this.watchMaybe(url).map(o =>
				o === undefined ? o : o.value
			))
		};

		return maybeAsyncValue;
	}

	/**
	 * Gets an async value as a possibly-undefined boolean.
	 * @see getMaybeAsyncValue
	 */
	public getMaybeAsyncValueBoolean (
		url: string,
		publicData: boolean = false
	) : IAsyncValue<boolean|undefined> {
		const {getValue, lock, setValue, updateValue}	= this.getMaybeAsyncValue(url, publicData);

		return {
			getValue: async () => {
				const value	= await getValue();
				return value === undefined ? undefined : util.bytesToBoolean(value);
			},
			lock,
			setValue: async value => setValue(
				value === undefined ? undefined : await util.toBytes(value)
			),
			updateValue: async f => updateValue(async value => {
				const newValue	= await f(
					value === undefined ? undefined : util.bytesToBoolean(value)
				);
				return newValue === undefined ? undefined : util.toBytes(newValue);
			}),
			watch: memoize(() => this.watchMaybeBoolean(url, publicData).map(o =>
				o === undefined ? o : o.value
			))
		};
	}

	/**
	 * Gets an async value as a possibly-undefined number.
	 * @see getMaybeAsyncValue
	 */
	public getMaybeAsyncValueNumber (
		url: string,
		publicData: boolean = false
	) : IAsyncValue<number|undefined> {
		const {getValue, lock, setValue, updateValue}	= this.getMaybeAsyncValue(url, publicData);

		return {
			getValue: async () => {
				const value	= await getValue();
				return value === undefined ? undefined : util.bytesToNumber(value);
			},
			lock,
			setValue: async value => setValue(
				value === undefined ? undefined : await util.toBytes(value)
			),
			updateValue: async f => updateValue(async value => {
				const newValue	= await f(
					value === undefined ? undefined : util.bytesToNumber(value)
				);
				return newValue === undefined ? undefined : util.toBytes(newValue);
			}),
			watch: memoize(() => this.watchMaybeNumber(url, publicData).map(o =>
				o === undefined ? o : o.value
			))
		};
	}

	/**
	 * Gets an async value as a possibly-undefined object.
	 * @see getMaybeAsyncValue
	 */
	public getMaybeAsyncValueObject<T> (
		url: string,
		proto: Proto<T>,
		publicData: boolean = false
	) : IAsyncValue<T|undefined> {
		const {getValue, lock, setValue, updateValue}	= this.getMaybeAsyncValue(url, publicData);

		return {
			getValue: async () => {
				const value	= await getValue();
				return value === undefined ? undefined : util.bytesToObject<T>(value, proto);
			},
			lock,
			setValue: async value => setValue(
				value === undefined ? undefined : await util.toBytes({data: value, proto})
			),
			updateValue: async f => updateValue(async value => {
				const newValue	= await f(
					value === undefined ? undefined : util.bytesToObject<T>(value, proto)
				);
				return newValue === undefined ? undefined : util.toBytes({data: newValue, proto});
			}),
			watch: memoize(() => this.watchMaybeObject<T>(url, proto, publicData).map(o =>
				o === undefined ? o : o.value
			))
		};
	}

	/**
	 * Gets an async value as a possibly-undefined string.
	 * @see getMaybeAsyncValue
	 */
	public getMaybeAsyncValueString (
		url: string,
		publicData: boolean = false
	) : IAsyncValue<string|undefined> {
		const {getValue, lock, setValue, updateValue}	= this.getMaybeAsyncValue(url, publicData);

		return {
			getValue: async () => {
				const value	= await getValue();
				return value === undefined ? undefined : util.bytesToString(value);
			},
			lock,
			setValue: async value => setValue(
				value === undefined ? undefined : await util.toBytes(value)
			),
			updateValue: async f => updateValue(async value => {
				const newValue	= await f(
					value === undefined ? undefined : util.bytesToString(value)
				);
				return newValue === undefined ? undefined : util.toBytes(newValue);
			}),
			watch: memoize(() => this.watchMaybeString(url, publicData).map(o =>
				o === undefined ? o : o.value
			))
		};
	}

	/**
	 * Gets an async value as a possibly-undefined base64 data URI.
	 * @see getMaybeAsyncValue
	 */
	public getMaybeAsyncValueURI (
		url: string,
		publicData: boolean = false
	) : IAsyncValue<string|undefined> {
		const {getValue, lock, setValue, updateValue}	= this.getMaybeAsyncValue(url, publicData);

		return {
			getValue: async () => {
				const value	= await getValue();
				return value === undefined ? undefined : util.bytesToDataURI(value);
			},
			lock,
			setValue: async value => setValue(
				value === undefined ? undefined : await util.toBytes(value)
			),
			updateValue: async f => updateValue(async value => {
				const newValue	= await f(
					value === undefined ? undefined : util.bytesToDataURI(value)
				);
				return newValue === undefined ? undefined : util.toBytes(newValue);
			}),
			watch: memoize(() => this.watchMaybeURI(url, publicData).map(o =>
				o === undefined ? o : o.value
			))
		};
	}

	/** Gets public keys belonging to the specified user. */
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

		const verified	= util.bytesToObject<{
			publicEncryptionKey: Uint8Array;
			publicSigningKey: Uint8Array;
			username: string;
		}>(
			await this.potassiumService.sign.open(
				signed,
				await this.potassiumService.sign.importSuperSphincsPublicKeys(
					this.agsePublicSigningKeys.rsa[rsaKeyIndex],
					this.agsePublicSigningKeys.sphincs[sphincsKeyIndex]
				)
			)
		);

		if (verified.username !== username) {
			throw new Error('Invalid AGSE-PKI certificate: bad username.');
		}

		return {
			encryption: verified.publicEncryptionKey,
			signing: verified.publicSigningKey
		};
	}

	/** Checks whether an item exists. */
	public async hasItem (url: string) : Promise<boolean> {
		return this.databaseService.hasItem(url);
	}

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	public async lock<T> (
		url: string,
		f: (reason?: string) => Promise<T>,
		reason?: string
	) : Promise<T> {
		if (!this.current) {
			throw new Error('User not signed in. Cannot lock.');
		}

		return this.databaseService.lock(
			this.processLockURL(url),
			async r => f(!r || !this.current ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(r),
						this.current.keys.symmetricKey
					)
				)
			),
			!reason ?
				undefined :
				this.potassiumService.toBase64(
					await this.potassiumService.secretBox.seal(
						this.potassiumService.fromString(reason),
						this.current.keys.symmetricKey
					)
				)
		);
	}

	/** Creates and returns a lock function that uses AccountDatabaseService.lock. */
	public lockFunction (url: string) : LockFunction {
		return async <T> (f: (reason?: string) => Promise<T>, reason?: string) =>
			this.lock(url, f, reason)
		;
	}

	/** Checks whether a lock is currently claimed and what the specified reason is. */
	public async lockStatus (url: string) : Promise<{locked: boolean; reason: string|undefined}> {
		const {locked, reason}	=
			await this.databaseService.lockStatus(this.processLockURL(url))
		;

		return {
			locked,
			reason: !reason || !this.current ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(reason),
						this.current.keys.symmetricKey
					)
				)
		};
	}

	/**
	 * Pushes an item to a list.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 * @returns Item URL.
	 */
	public async pushItem<T = never> (
		url: string,
		value: DataType<T>,
		publicData: boolean = false
	) : Promise<{hash: string; url: string}> {
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
	public async setItem<T = never> (
		url: string,
		value: DataType<T>,
		publicData: boolean = false
	) : Promise<{hash: string; url: string}> {
		return this.lock(url, async () => this.setItemInternal(
			url,
			value,
			publicData,
			'set',
			async (u, v) => this.databaseService.setItem(u, v)
		));
	}

	/**
	 * Uploads value and gives progress.
	 * @param publicData If true, signs the item. Otherwise, encrypts the item.
	 */
	public uploadItem<T = never> (
		url: string,
		value: DataType<T>,
		publicData: boolean = false
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		let cancel	= () => {};
		const cancelPromise	= new Promise<void>(resolve => {
			cancel	= resolve;
		});

		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const uploadTask	= await this.setItemInternal(
				url,
				value,
				publicData,
				'upload',
				async (u, v) => this.databaseService.uploadItem(u, v)
			);

			cancelPromise.then(() => { uploadTask.cancel(); });

			uploadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return uploadTask.result;
		})();

		return {cancel, progress, result};
	}

	/** Waits for lock to be released. */
	public async waitForUnlock (url: string) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		const {reason, wasLocked}	=
			await this.databaseService.waitForUnlock(this.processLockURL(url))
		;

		return {
			reason: !reason || !this.current ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(reason),
						this.current.keys.symmetricKey
					)
				)
			,
			wasLocked
		};
	}

	/** Subscribes to a list of values. */
	public watchList<T = Uint8Array> (
		url: string,
		publicData: boolean = false,
		mapper: (value: Uint8Array) => T = (value: Uint8Array&T) => value
	) : Observable<{timestamp: number; value: T}[]> {
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
	public watchListBoolean (url: string, publicData: boolean = false) : Observable<{
		timestamp: number;
		value: boolean;
	}[]> {
		return this.watchList<boolean>(url, publicData, value => util.bytesToBoolean(value));
	}

	/**
	 * Subscribes to a list of values as numbers.
	 * @see watchList
	 */
	public watchListNumber (url: string, publicData: boolean = false) : Observable<{
		timestamp: number;
		value: number;
	}[]> {
		return this.watchList<number>(url, publicData, value => util.bytesToNumber(value));
	}

	/**
	 * Subscribes to a list of values as objects.
	 * @see watchList
	 */
	public watchListObject<T> (
		url: string,
		proto: Proto<T>,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: T}[]> {
		return this.watchList<T>(url, publicData, value => util.bytesToObject<T>(value, proto));
	}

	/**
	 * Subscribes to a list of values as strings.
	 * @see watchList
	 */
	public watchListString (url: string, publicData: boolean = false) : Observable<{
		timestamp: number;
		value: string;
	}[]> {
		return this.watchList<string>(url, publicData, value => util.bytesToString(value));
	}

	/**
	 * Subscribes to a list of values as base64 data URIs.
	 * @see watchList
	 */
	public watchListURI (url: string, publicData: boolean = false) : Observable<{
		timestamp: number;
		value: string;
	}[]> {
		return this.watchList<string>(url, publicData, value => util.bytesToDataURI(value));
	}

	/** Subscribes to a possibly-undefined value. */
	public watchMaybe (
		url: string,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: Uint8Array}|undefined> {
		url	= this.processURL(url);

		if (publicData) {
			const username	= this.getUsernameFromURL(url);

			return this.databaseService.watchMaybe(url).flatMap(async data =>
				data === undefined ? undefined : {
					timestamp: data.timestamp,
					value: await this.openPublicData(username, data.value)
				}
			);
		}
		else if (this.current) {
			const symmetricKey	= this.current.keys.symmetricKey;

			return this.databaseService.watchMaybe(url).flatMap(async data =>
				data === undefined ? undefined : {
					timestamp: data.timestamp,
					value: await this.potassiumService.secretBox.open(data.value, symmetricKey)
				}
			);
		}
		else {
			throw new Error(`User not signed in. Cannot watch private data at ${url}.`);
		}
	}

	/**
	 * Subscribes to a possibly-undefined value as a boolean.
	 * @see watchMaybe
	 */
	public watchMaybeBoolean (
		url: string,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: boolean}|undefined> {
		return this.watchMaybe(url, publicData).map(o =>
			o === undefined ? undefined : {
				timestamp: o.timestamp,
				value: util.bytesToBoolean(o.value)
			}
		);
	}

	/**
	 * Subscribes to a possibly-undefined value as a number.
	 * @see watchMaybe
	 */
	public watchMaybeNumber (
		url: string,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: number}|undefined> {
		return this.watchMaybe(url, publicData).map(o =>
			o === undefined ? undefined : {
				timestamp: o.timestamp,
				value: util.bytesToNumber(o.value)
			}
		);
	}

	/**
	 * Subscribes to a possibly-undefined value as an object.
	 * @see watchMaybe
	 */
	public watchMaybeObject<T> (
		url: string,
		proto: Proto<T>,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: T}|undefined> {
		return this.watchMaybe(url, publicData).map(o =>
			o === undefined ? undefined : {
				timestamp: o.timestamp,
				value: util.bytesToObject<T>(o.value, proto)
			}
		);
	}

	/**
	 * Subscribes to a possibly-undefined value as a string.
	 * @see watchMaybe
	 */
	public watchMaybeString (
		url: string,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: string}|undefined> {
		return this.watchMaybe(url, publicData).map(o =>
			o === undefined ? undefined : {
				timestamp: o.timestamp,
				value: util.bytesToString(o.value)
			}
		);
	}

	/**
	 * Subscribes to a possibly-undefined value as a base64 data URI.
	 * @see watchMaybe
	 */
	public watchMaybeURI (
		url: string,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: string}|undefined> {
		return this.watchMaybe(url, publicData).map(o =>
			o === undefined ? undefined : {
				timestamp: o.timestamp,
				value: util.bytesToDataURI(o.value)
			}
		);
	}

	/** Subscribes to a value. */
	public watchValue (
		url: string,
		publicData: boolean = false,
		defaultValue: () => Uint8Array|Promise<Uint8Array> = () => new Uint8Array([])
	) : Observable<{timestamp: number; value: Uint8Array}> {
		return this.watchMaybe(url, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	/**
	 * Subscribes to a value as a boolean.
	 * @see watchValue
	 */
	public watchValueBoolean (
		url: string,
		publicData: boolean = false,
		defaultValue: () => boolean|Promise<boolean> = () => false
	) : Observable<{timestamp: number; value: boolean}> {
		return this.watchMaybeBoolean(url, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	/**
	 * Subscribes to a value as a number.
	 * @see watchValue
	 */
	public watchValueNumber (
		url: string,
		publicData: boolean = false,
		defaultValue: () => number|Promise<number> = () => 0
	) : Observable<{timestamp: number; value: number}> {
		return this.watchMaybeNumber(url, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	/**
	 * Subscribes to a value as an object.
	 * @see watchValue
	 */
	public watchValueObject<T> (
		url: string,
		proto: Proto<T>,
		defaultValue: () => T|Promise<T>,
		publicData: boolean = false
	) : Observable<{timestamp: number; value: T}> {
		return this.watchMaybeObject<T>(url, proto, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	/**
	 * Subscribes to a value as a string.
	 * @see watchValue
	 */
	public watchValueString (
		url: string,
		publicData: boolean = false,
		defaultValue: () => string|Promise<string> = () => ''
	) : Observable<{timestamp: number; value: string}> {
		return this.watchMaybeString(url, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	/**
	 * Subscribes to a value as a base64 data URI.
	 * @see watchValue
	 */
	public watchValueURI (
		url: string,
		publicData: boolean = false,
		defaultValue: () => string|Promise<string> = () => 'data:text/plain;base64,'
	) : Observable<{timestamp: number; value: string}> {
		return this.watchMaybeURI(url, publicData).flatMap(async value =>
			value === undefined ?
				{timestamp: await util.timestamp(), value: defaultValue()} :
				value
		);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
