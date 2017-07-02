import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {User} from '../account/user';
import {DataType} from '../data-type';
import {util} from '../util';
import {LocalStorageService} from './local-storage.service';


/**
 * Account database service.
 */
@Injectable()
export class AccountDatabaseService {
	/** Keys and profile of currently logged in user. Undefined if no user is signed in. */
	public current?: {
		keys: {};
		user: User;
	};

	/** @ignore */
	private dummyKey (url: string, publicData: boolean) : string {
		return `${url}_${publicData.toString()}`;
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

	/** Downloads value and gives progress. */
	public downloadItem (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<Uint8Array>;
	} {
		return {progress: Observable.of(100), result: this.getItem(url, publicData)};
	}

	/**
	 * Downloads a value as a boolean.
	 * @see downloadItem
	 */
	public downloadItemBoolean (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<boolean>;
	} {
		const o	= this.downloadItem(url, publicData);
		return {
			progress: o.progress,
			result: o.result.then(value => util.bytesToBoolean(value))
		};
	}

	/**
	 * Downloads a value as a number.
	 * @see downloadItem
	 */
	public downloadItemNumber (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<number>;
	} {
		const o	= this.downloadItem(url, publicData);
		return {
			progress: o.progress,
			result: o.result.then(value => util.bytesToNumber(value))
		};
	}

	/**
	 * Downloads a value as an object.
	 * @see downloadItem
	 */
	public downloadItemObject<T> (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<T>;
	} {
		const o	= this.downloadItem(url, publicData);
		return {
			progress: o.progress,
			result: o.result.then(value => util.bytesToObject<T>(value))
		};
	}

	/**
	 * Downloads a value as a string.
	 * @see downloadItem
	 */
	public downloadItemString (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		const o	= this.downloadItem(url, publicData);
		return {
			progress: o.progress,
			result: o.result.then(value => util.bytesToString(value))
		};
	}

	/**
	 * Downloads a value as a base64 data URI.
	 * @see downloadItem
	 */
	public downloadItemURI (url: string, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		const o	= this.downloadItem(url, publicData);
		return {
			progress: o.progress,
			result: o.result.then(value => util.bytesToDataURI(value))
		};
	}

	/**
	 * Gets an item's value.
	 * @param url Path to item.
	 * @param publicData If true, validates the item's signature. Otherwise, decrypts the item.
	 */
	public async getItem (url: string, publicData: boolean = false) : Promise<Uint8Array> {
		if (!publicData && !this.current) {
			throw new Error(`User not signed in. Cannot get private data at ${url}.`);
		}

		url	= this.processURL(url);

		return this.localStorageService.getItem(this.dummyKey(url, publicData));
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
	public async getItemObject<T> (url: string, publicData: boolean = false) : Promise<T> {
		return util.bytesToObject<T>(await this.getItem(url, publicData));
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

	/** Checks whether an item exists. */
	public async hasItem (url: string) : Promise<boolean> {
		try {
			await this.getItem(url, true).catch(async () => this.getItem(url, false));
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/**
	 * Deletes an item.
	 * @param url Path to item.
	 */
	public async removeItem (url: string) : Promise<void> {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot remove item at ${url}.`);
		}

		url	= this.processURL(url);

		for (const publicData of [true, false]) {
			const success	= await this.localStorageService.removeItem(
				this.dummyKey(url, publicData)
			).then(
				() => true
			).catch(
				() => false
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
	 * @returns Item URL.
	 */
	public async setItem (
		url: string,
		value: DataType,
		publicData: boolean = false
	) : Promise<{hash: string; url: string}> {
		if (!this.current) {
			throw new Error(`User not signed in. Cannot set item at ${url}.`);
		}
		else if (typeof value === 'number' && isNaN(value)) {
			throw new Error(`Cannot set NaN as item value at ${url}.`);
		}

		url	= this.processURL(url);

		await this.localStorageService.setItem(
			this.dummyKey(url, publicData),
			await util.toBytes(value)
		);

		return {hash: '', url};
	}

	/** Uploads value and gives progress. */
	public uploadItem (
		url: string,
		value: DataType,
		publicData: boolean = false
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		return {
			cancel: () => {},
			progress: Observable.of(100),
			result: this.setItem(url, value, publicData)
		};
	}

	constructor (
		/** @ignore */
		private readonly localStorageService: LocalStorageService
	) {}
}
