/* eslint-disable @typescript-eslint/require-await */

import {Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {IAsyncMap} from './iasync-map';
import {LocalAsyncValue} from './local-async-value';
import {LockFunction} from './lock-function-type';
import {getOrSetDefault} from './util/get-or-set-default';
import {lockFunction} from './util/lock';

/**
 * IAsyncMap implementation that wraps a local value.
 */
export class LocalAsyncMap<K, V>
	extends LocalAsyncValue<Map<K, V>>
	implements IAsyncMap<K, V>
{
	/** @ignore */
	protected readonly itemLocks = new Map<K, LockFunction>();

	/** @ignore */
	protected lockItem (key: K) : LockFunction {
		return getOrSetDefault(this.itemLocks, key, lockFunction);
	}

	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.clearInternal();
	}

	/** @ignore */
	public clearInternal (emit: boolean = true) : void {
		this.value.clear();

		if (emit) {
			this.emitInternal();
		}
	}

	/** @ignore */
	public emitInternal () : void {
		this.subject.next(new Map<K, V>(this.value));
	}

	/** @inheritDoc */
	public async getItem (key: K) : Promise<V> {
		return this.lockItem(key)(async () => this.getItemInternal(key));
	}

	/** @ignore */
	public getItemInternal (key: K) : V {
		if (!this.value.has(key)) {
			throw new Error(
				typeof key === 'boolean' ||
				typeof key === 'number' ||
				typeof key === 'string' ?
					`No item ${key.toString()} in async map.` :
					'Item not found in async map.'
			);
		}

		return <V> this.value.get(key);
	}

	/** @inheritDoc */
	public async getKeys () : Promise<K[]> {
		return Array.from(this.value.keys());
	}

	/** @inheritDoc */
	public async hasItem (key: K) : Promise<boolean> {
		return this.lockItem(key)(async () => this.value.has(key));
	}

	/** @inheritDoc */
	public async removeItem (key: K) : Promise<void> {
		await this.lockItem(key)(async () => {
			this.removeItemInternal(key);
		});
	}

	/** @ignore */
	public removeItemInternal (key: K) : void {
		this.value.delete(key);
		this.emitInternal();
	}

	/** @inheritDoc */
	public async setItem (key: K, value: V) : Promise<void> {
		await this.lockItem(key)(async () => {
			this.setItemInternal(key, value);
		});
	}

	/** @ignore */
	public setItemInternal (key: K, value: V, emit: boolean = true) : void {
		this.value.set(key, value);

		if (emit) {
			this.emitInternal();
		}
	}

	/** @inheritDoc */
	public async size () : Promise<number> {
		return this.value.size;
	}

	/** @inheritDoc */
	public async updateItem (
		key: K,
		f: (value?: V) => Promise<V | undefined>
	) : Promise<void> {
		await this.lockItem(key)(async () => {
			let value: V | undefined;
			try {
				value = this.getItemInternal(key);
			}
			catch {}

			let newValue: V | undefined;
			try {
				newValue = await f(value);
			}
			catch {
				return;
			}

			if (newValue === undefined) {
				this.removeItemInternal(key);
			}
			else {
				this.setItemInternal(key, newValue);
			}
		});
	}

	/** @inheritDoc */
	public async updateValue (
		f: (value: Map<K, V>) => Promise<Map<K, V>>
	) : Promise<void> {
		await this.lock(async () => {
			try {
				this.setValueInternal(await f(this.value), false);
				this.emitInternal();
			}
			catch {}
		});
	}

	/** @inheritDoc */
	public watchItem (key: K) : Observable<V | undefined> {
		return this.watch().pipe(
			switchMap(async () => this.getItem(key).catch(() => undefined))
		);
	}

	/** @inheritDoc */
	public watchKeys () : Observable<K[]> {
		return this.watch().pipe(map(value => Array.from(value.keys())));
	}

	/** @inheritDoc */
	public watchSize () : Observable<number> {
		return this.watch().pipe(map(value => value.size));
	}

	constructor (value?: Map<K, V>) {
		super(value || new Map<K, V>());
	}
}
