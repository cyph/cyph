import {Observable} from 'rxjs';
import {IAsyncMap} from '../iasync-map';
import {IProto} from '../iproto';
import {LocalAsyncMap} from '../local-async-map';
import {deserialize, serialize} from '../util/serialization';
import {IPotassium} from './potassium/ipotassium';


/**
 * Wraps an async map with per-value encryption.
 */
export class EncryptedAsyncMap<K, V> {
	/** @ignore */
	private async seal (key: K, value: V, encryptionKey: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		plaintext: Uint8Array;
	}> {
		const plaintext	= await serialize(this.proto, value);

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
	public async getItem (key: K, encryptionKey: Uint8Array, hash: Uint8Array) : Promise<V> {
		return deserialize(this.proto, await this.getItemBytes(key, encryptionKey, hash));
	}

	/** Gets item value as bytes. */
	public async getItemBytes (
		key: K,
		encryptionKey: Uint8Array,
		hash: Uint8Array
	) : Promise<Uint8Array> {
		const plaintext	= await this.getItemBytesUnsafe(key, encryptionKey);

		if (!this.potassium.compareMemory(hash, await this.potassium.hash.hash(plaintext))) {
			throw new Error('Invalid hash in EncryptedAsyncMap.getItemBytes.');
		}

		return plaintext;
	}

	/** Gets item value as bytes with no hash validation. */
	public async getItemBytesUnsafe (key: K, encryptionKey: Uint8Array) : Promise<Uint8Array> {
		return this.potassium.secretBox.open(
			await this.map.getItem(key),
			encryptionKey,
			`${this.name}/${key}`
		);
	}

	/** Gets hash of item value. */
	public async getItemHash (key: K, encryptionKey: Uint8Array) : Promise<Uint8Array> {
		return this.potassium.hash.hash(await this.getItemBytesUnsafe(key, encryptionKey));
	}

	/** Gets item value with no hash validation. */
	public async getItemUnsafe (key: K, encryptionKey: Uint8Array) : Promise<V> {
		return deserialize(this.proto, await this.getItemBytesUnsafe(key, encryptionKey));
	}

	/** @see IAsyncMap.getKeys */
	public async getKeys () : Promise<K[]> {
		return this.map.getKeys();
	}

	/** @see IAsyncMap.hasItem */
	public async hasItem (key: K) : Promise<boolean> {
		return this.map.hasItem(key);
	}

	/** @see IAsyncMap.removeItem */
	public async removeItem (key: K) : Promise<void> {
		return this.map.removeItem(key);
	}

	/** @see IAsyncMap.setItem */
	public async setItem (key: K, value: V, encryptionKey: Uint8Array) : Promise<void> {
		const {cyphertext}	= await this.seal(key, value, encryptionKey);
		return this.map.setItem(key, cyphertext);
	}

	/** @see IAsyncMap.setItem */
	public async setItemEasy (key: K, value: V) : Promise<{
		encryptionKey: Uint8Array;
		hash: Uint8Array;
	}> {
		const encryptionKey	= this.potassium.randomBytes(await this.potassium.secretBox.keyBytes);

		const {cyphertext, plaintext}	= await this.seal(key, value, encryptionKey);

		await this.map.setItem(key, cyphertext);

		return {
			encryptionKey,
			hash: await this.potassium.hash.hash(plaintext)
		};
	}

	/** @see IAsyncMap.size */
	public async size () : Promise<number> {
		return this.map.size();
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
		private readonly proto: IProto<V>,

		/** @ignore */
		private readonly map: IAsyncMap<K, Uint8Array> = new LocalAsyncMap()
	) {}
}
