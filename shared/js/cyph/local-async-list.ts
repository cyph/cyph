/* eslint-disable @typescript-eslint/require-await */

import {Observable, ReplaySubject, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {IAsyncList} from './iasync-list';
import {ITimedValue} from './itimed-value';
import {LocalAsyncMap} from './local-async-map';
import {LockFunction} from './lock-function-type';
import {MaybePromise} from './maybe-promise-type';
import {flattenAndOmitDuplicates} from './util/reducers';

/**
 * IAsyncList implementation that wraps a local value.
 */
export class LocalAsyncList<T> implements IAsyncList<T> {
	/** @ignore */
	protected readonly map: LocalAsyncMap<number, T>;

	/** @ignore */
	protected nextID: number;

	/** @ignore */
	protected readonly pushes = new ReplaySubject<{id: number; value: T}>();

	/** @inheritDoc */
	public readonly lock: LockFunction;

	/** @ignore */
	protected clearInternal (emit: boolean = true) : void {
		this.nextID = 0;
		this.map.clearInternal(emit);
	}

	/** @ignore */
	protected getValueInternal (
		mapValue: Map<number, T> = this.map.value
	) : T[] {
		return Array.from(mapValue.entries())
			.sort((a, b) => a[0] - b[0])
			.map(arr => arr[1]);
	}

	/** @ignore */
	protected setValueInternal (value: T[]) : void {
		this.clearInternal(false);
		for (const item of value) {
			this.pushItemInternal(item, false);
		}
		this.map.emitInternal();
	}

	/** @ignore */
	public pushItemInternal (value: T, emit: boolean = true) : void {
		const id = this.nextID++;
		this.map.setItemInternal(id, value, emit);
		this.pushes.next({id, value});
	}

	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.clearInternal();
	}

	/** @inheritDoc */
	public async getFlatValue () : Promise<T extends any[] ? T : T[]> {
		return <any> this.getValueInternal().flat();
	}

	/** @inheritDoc */
	public async getTimedValue () : Promise<ITimedValue<T>[]> {
		throw new Error('LocalAsyncList.getTimedValue() not implemented.');
	}

	/** @inheritDoc */
	public async getValue () : Promise<T[]> {
		return this.getValueInternal();
	}

	/** @inheritDoc */
	public async pushItem (value: T) : Promise<void> {
		this.pushItemInternal(value);
	}

	/** @inheritDoc */
	public async setValue (value: T[]) : Promise<void> {
		this.setValueInternal(value);
	}

	/** @inheritDoc */
	public subscribeAndPop (
		f: (value: T) => MaybePromise<void>
	) : Subscription {
		return this.pushes.subscribe(async ({id, value}) => {
			try {
				await f(value);
				this.map.removeItemInternal(id);
			}
			catch {}
		});
	}

	/** @inheritDoc */
	public async updateValue (f: (value: T[]) => Promise<T[]>) : Promise<void> {
		await this.lock(async () => {
			try {
				this.setValueInternal(await f(this.getValueInternal()));
			}
			catch {}
		});
	}

	/** @inheritDoc */
	public watch () : Observable<T[]> {
		return this.map
			.watch()
			.pipe(map(mapValue => this.getValueInternal(mapValue)));
	}

	/** @inheritDoc */
	public watchFlat (
		omitDuplicates?: boolean
	) : Observable<T extends any[] ? T : T[]> {
		return this.watch().pipe<any>(
			map(arr =>
				omitDuplicates ? flattenAndOmitDuplicates(arr) : arr.flat()
			)
		);
	}

	/** @inheritDoc */
	public watchPushes () : Observable<T> {
		return this.pushes.pipe(map(o => o.value));
	}

	constructor (value?: T[]) {
		this.map = new LocalAsyncMap<number, T>(
			value ?
				new Map<number, T>(value.map((v, i) : [number, T] => [i, v])) :
				undefined
		);

		this.lock = this.map.lock;
		this.nextID = value ? value.length : 0;
	}
}
