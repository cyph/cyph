import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {IAsyncMap} from './iasync-map';
import {LocalAsyncValue} from './local-async-value';


/**
 * IAsyncMap implementation that wraps a local value.
 */
export class LocalAsyncMap<K, V> extends LocalAsyncValue<Map<K, V>> implements IAsyncMap<K, V> {
	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.value.clear();
	}

	/** @inheritDoc */
	public async getItem (key: K) : Promise<V> {
		if (!this.value.has(key)) {
			throw new Error(`No item ${key} in async map.`);
		}

		return <V> this.value.get(key);
	}

	/** @inheritDoc */
	public async getKeys () : Promise<K[]> {
		return Array.from(this.value.keys());
	}

	/** @inheritDoc */
	public async hasItem (key: K) : Promise<boolean> {
		return this.value.has(key);
	}

	/** @inheritDoc */
	public async removeItem (key: K) : Promise<void> {
		this.value.delete(key);
	}

	/** @inheritDoc */
	public async setItem (key: K, value: V) : Promise<void> {
		this.value.set(key, value);
	}

	/** @inheritDoc */
	public async size () : Promise<number> {
		return this.value.size;
	}

	/** @inheritDoc */
	public watchSize () : Observable<number> {
		return this.watch().pipe(map(value => value.size));
	}

	constructor (value?: Map<K, V>) {
		super(value || new Map<K, V>());
	}
}
