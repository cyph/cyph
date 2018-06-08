import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {IAsyncMap} from './iasync-map';
import {LocalAsyncValue} from './local-async-value';
import {LockFunction} from './lock-function-type';
import {getOrSetDefault} from './util/get-or-set-default';
import {lockFunction} from './util/lock';


/**
 * IAsyncMap implementation that wraps a local value.
 */
export class LocalAsyncMap<K, V> extends LocalAsyncValue<Map<K, V>> implements IAsyncMap<K, V> {
	/** @ignore */
	private readonly itemLocks: Map<K, LockFunction>	= new Map<K, LockFunction>();

	/** @ignore */
	private lockItem (key: K) : LockFunction {
		return getOrSetDefault(this.itemLocks, key, lockFunction);
	}

	/** @ignore */
	private async getItemInternal (key: K) : Promise<V> {
		if (!this.value.has(key)) {
			throw new Error(`No item ${key} in async map.`);
		}

		return <V> this.value.get(key);
	}

	/** @ignore */
	private async removeItemInternal (key: K) : Promise<void> {
		await this.value.delete(key);
	}

	/** @ignore */
	private async setItemInternal (key: K, value: V) : Promise<void> {
		this.value.set(key, value);
	}

	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.value.clear();
	}

	/** @inheritDoc */
	public async getItem (key: K) : Promise<V> {
		return this.lockItem(key)(async () => this.getItemInternal(key));
	}

	/** @inheritDoc */
	public async getKeys () : Promise<K[]> {
		return Array.from(this.value.keys());
	}

	/** @inheritDoc */
	public async hasItem (key: K) : Promise<boolean> {
		return this.lockItem(key)(async () =>
			this.value.has(key)
		);
	}

	/** @inheritDoc */
	public async removeItem (key: K) : Promise<void> {
		await this.lockItem(key)(async () => this.removeItemInternal(key));
	}

	/** @inheritDoc */
	public async setItem (key: K, value: V) : Promise<void> {
		await this.lockItem(key)(async () => this.setItemInternal(key, value));
	}

	/** @inheritDoc */
	public async size () : Promise<number> {
		return this.value.size;
	}

	/** @inheritDoc */
	public async updateItem (key: K, f: (value?: V) => Promise<V|undefined>) : Promise<void> {
		await this.lockItem(key)(async () => {
			const value	= await this.getItemInternal(key).catch(() => undefined);
			let newValue: V|undefined;
			try {
				newValue	= await f(value);
			}
			catch {
				return;
			}
			if (newValue === undefined) {
				await this.removeItemInternal(key);
			}
			else {
				await this.setItemInternal(key, newValue);
			}
		});
	}

	/** @inheritDoc */
	public watchSize () : Observable<number> {
		return this.watch().pipe(map(value => value.size));
	}

	constructor (value?: Map<K, V>) {
		super(value || new Map<K, V>());
	}
}
