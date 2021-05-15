/* eslint-disable @typescript-eslint/require-await */

import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {IAsyncSet} from './iasync-set';
import {LocalAsyncValue} from './local-async-value';

/**
 * Local async Set implementation.
 */
export class LocalAsyncSet<T>
	extends LocalAsyncValue<Set<T>>
	implements IAsyncSet<T>
{
	/** @ignore */
	protected emitInternal () : void {
		this.subject.next(new Set<T>(this.value));
	}

	/** @inheritDoc */
	public async addItem (value: T) : Promise<void> {
		this.value.add(value);
		this.emitInternal();
	}

	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.value.clear();
		this.emitInternal();
	}

	/** @inheritDoc */
	public async deleteItem (value: T) : Promise<void> {
		this.value.delete(value);
		this.emitInternal();
	}

	/** @see Set.entries */
	public async entries () : Promise<IterableIterator<[T, T]>> {
		return this.value.entries();
	}

	/** @see Set.forEach */
	public async forEach (
		callback: (a: T, b: T, value: Set<T>) => void
	) : Promise<void> {
		this.value.forEach(callback);
	}

	/** @inheritDoc */
	public async hasItem (value: T) : Promise<boolean> {
		return this.value.has(value);
	}

	/** @see Set.keys */
	public async keys () : Promise<IterableIterator<T>> {
		return this.value.keys();
	}

	/** Deletes and adds an item. */
	public async replaceItem (oldValue: T, newValue: T) : Promise<void> {
		this.value.delete(oldValue);
		this.value.add(newValue);
		this.emitInternal();
	}

	/** @inheritDoc */
	public async size () : Promise<number> {
		return this.value.size;
	}

	/** @see Set.values */
	public async values () : Promise<IterableIterator<T>> {
		return this.value.values();
	}

	/** @inheritDoc */
	public watchSize () : Observable<number> {
		return this.watch().pipe(map(value => value.size));
	}

	constructor (value?: Set<T>) {
		super(value || new Set<T>());
	}
}
