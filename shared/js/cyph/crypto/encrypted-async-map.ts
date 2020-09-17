import {Observable} from 'rxjs';
import {IAsyncMap} from '../iasync-map';
import {IProto} from '../iproto';
import {LocalAsyncMap} from '../local-async-map';
import {MaybePromise} from '../maybe-promise-type';
import {debugLogError} from '../util/log';
import {deserialize, serialize} from '../util/serialization';
import {IPotassium} from './potassium/ipotassium';

/**
 * Wraps an async map with per-value encryption.
 */
export class EncryptedAsyncMap<T> {
	/** @ignore */
	private async hash<H> (
		value: T | undefined,
		plaintext?: Uint8Array,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>},
		clearPlaintext: boolean = false
	) : Promise<Uint8Array> {
		if (hasher) {
			if (plaintext) {
				if (value === undefined) {
					value = await deserialize(this.proto, plaintext);
				}

				if (clearPlaintext) {
					this.potassium.clearMemory(plaintext);
				}
			}

			if (value !== undefined) {
				plaintext = await serialize(
					hasher.proto,
					await hasher.transform(value)
				);
			}
		}

		if (plaintext === undefined) {
			throw new Error('No plaintext to hash.');
		}

		const hash = await this.potassium.hash.hash(plaintext);

		if (clearPlaintext) {
			this.potassium.clearMemory(plaintext);
		}

		return hash;
	}

	/** @ignore */
	private async open (
		key: string,
		cyphertext: Uint8Array,
		encryptionKey: Uint8Array
	) : Promise<Uint8Array> {
		return this.potassium.secretBox.open(
			cyphertext,
			encryptionKey,
			`${this.name}/${key}`
		);
	}

	/** @ignore */
	private async seal (
		key: string,
		value: T,
		encryptionKey: Uint8Array
	) : Promise<{
		cyphertext: Uint8Array;
		plaintext: Uint8Array;
	}> {
		const plaintext = await serialize(this.proto, value);

		return {
			cyphertext: await this.potassium.secretBox.seal(
				plaintext,
				encryptionKey,
				`${this.name}/${key}`
			),
			plaintext
		};
	}

	/** @see IAsyncMap.clear */
	public async clear () : Promise<void> {
		return this.map.clear();
	}

	/** @see IAsyncMap.getItem */
	public async getItem<H = never> (
		key: string,
		encryptionKey: Uint8Array,
		hash: Uint8Array,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>}
	) : Promise<T> {
		return deserialize(
			this.proto,
			await this.getItemBytes(key, encryptionKey, hash, hasher)
		);
	}

	/** Gets item value as bytes. */
	public async getItemBytes<H = never> (
		key: string,
		encryptionKey: Uint8Array,
		hash: Uint8Array,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>}
	) : Promise<Uint8Array> {
		const plaintext = await this.getItemBytesUnsafe(key, encryptionKey);
		const computedHash = await this.hash(undefined, plaintext, hasher);

		if (!this.potassium.compareMemory(hash, computedHash)) {
			debugLogError(async () => ({
				encryptedAsyncMapInvalidHash: {
					computedHash,
					hash,
					plaintext,
					plaintextObject: await deserialize(
						this.proto,
						plaintext
					).catch(err => ({err}))
				}
			}));

			throw new Error('Invalid hash in EncryptedAsyncMap.getItemBytes.');
		}

		return plaintext;
	}

	/** Gets item value as bytes with no hash validation. */
	public async getItemBytesUnsafe (
		key: string,
		encryptionKey: Uint8Array
	) : Promise<Uint8Array> {
		return this.open(key, await this.map.getItem(key), encryptionKey);
	}

	/** Gets hash of item value. */
	public async getItemHash<H = never> (
		key: string,
		encryptionKey: Uint8Array,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>},
		value?: T
	) : Promise<Uint8Array> {
		return this.hash(
			value,
			hasher && value !== undefined ?
				undefined :
				await this.getItemBytesUnsafe(key, encryptionKey),
			hasher,
			true
		);
	}

	/** Gets item value with no hash validation. */
	public async getItemUnsafe (
		key: string,
		encryptionKey: Uint8Array
	) : Promise<T> {
		return deserialize(
			this.proto,
			await this.getItemBytesUnsafe(key, encryptionKey)
		);
	}

	/** @see IAsyncMap.getKeys */
	public async getKeys () : Promise<string[]> {
		return this.map.getKeys();
	}

	/** @see IAsyncMap.hasItem */
	public async hasItem (key: string) : Promise<boolean> {
		return this.map.hasItem(key);
	}

	/** @see IAsyncMap.removeItem */
	public async removeItem (key: string) : Promise<void> {
		return this.map.removeItem(key);
	}

	/** @see IAsyncMap.setItem */
	public async setItem<H = never> (
		key: string,
		value: T,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>}
	) : Promise<{
		encryptionKey: Uint8Array;
		getHash: () => Promise<Uint8Array>;
	}> {
		const encryptionKey = this.potassium.randomBytes(
			await this.potassium.secretBox.keyBytes
		);

		const {cyphertext, plaintext} = await this.seal(
			key,
			value,
			encryptionKey
		);

		const hash = Promise.all([
			this.hash(value, plaintext, hasher, true),
			this.map.setItem(key, cyphertext)
		]).then(([h]) => h);

		return {
			encryptionKey,
			getHash: async () => hash
		};
	}

	/** Sets an item with a custom encryption key. */
	public async setItemManual (
		key: string,
		value: T,
		encryptionKey: Uint8Array
	) : Promise<void> {
		const {cyphertext} = await this.seal(key, value, encryptionKey);
		return this.map.setItem(key, cyphertext);
	}

	/** @see IAsyncMap.size */
	public async size () : Promise<number> {
		return this.map.size();
	}

	/** @see IAsyncMap.updateItem */
	public async updateItem<H = never> (
		key: string,
		encryptionKey: Uint8Array,
		f: (value?: T) => Promise<T | undefined>,
		hasher?: {proto: IProto<H>; transform: (value: T) => MaybePromise<H>}
	) : Promise<{
		hash: Uint8Array | undefined;
	}> {
		let newValue: T | undefined;
		let plaintext: Uint8Array | undefined;

		await this.map.updateItem(key, async cyphertext => {
			newValue = await f(
				!cyphertext ?
					undefined :
					await deserialize(
						this.proto,
						await this.open(key, cyphertext, encryptionKey)
					)
			);

			if (newValue === undefined) {
				return undefined;
			}

			const newBytes = await this.seal(key, newValue, encryptionKey);
			plaintext = newBytes.plaintext;

			return newBytes.cyphertext;
		});

		if (newValue === undefined || plaintext === undefined) {
			return {hash: undefined};
		}

		return {hash: await this.hash(newValue, plaintext, hasher, true)};
	}

	/** @see IAsyncMap.watchSize */
	public watchSize () : Observable<number> {
		return this.map.watchSize();
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly name: string,

		/** @ignore */
		private readonly proto: IProto<T>,

		/** @ignore */
		private readonly map: IAsyncMap<
			string,
			Uint8Array
		> = new LocalAsyncMap()
	) {}
}
