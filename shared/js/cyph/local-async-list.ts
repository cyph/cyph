import {Observable, ReplaySubject, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {IAsyncList} from './iasync-list';
import {LocalAsyncValue} from './local-async-value';
import {MaybePromise} from './maybe-promise-type';


/**
 * IAsyncList implementation that wraps a local value.
 */
export class LocalAsyncList<T> extends LocalAsyncValue<T[]> implements IAsyncList<T> {
	/** @ignore */
	protected readonly pushes: ReplaySubject<{index: number; value: T}>	= new ReplaySubject();

	/** @inheritDoc */
	public async clear () : Promise<void> {
		this.value.splice(0);
		this.subject.next(this.value);
	}

	/** @inheritDoc */
	public async getFlatValue () : Promise<T extends any[] ? T : T[]> {
		return (await this.getValue()).reduce<any>((a, b) => a.concat(b), []);
	}

	/** @inheritDoc */
	public async pushItem (value: T) : Promise<void> {
		this.pushes.next({index: this.value.push(value), value});
		this.subject.next(this.value);
	}

	/** @inheritDoc */
	public async setValue (value: T[]) : Promise<void> {
		await super.setValue(value);
		for (let i = 0 ; i < value.length ; ++i) {
			this.pushes.next({index: i, value: value[i]});
		}
	}

	/** @inheritDoc */
	public subscribeAndPop (f: (value: T) => MaybePromise<void>) : Subscription {
		return this.pushes.subscribe(async ({index, value}) => {
			try {
				await f(value);
				this.value.splice(index, 1);
				this.subject.next(this.value);
			}
			catch {}
		});
	}

	/** @inheritDoc */
	public watchFlat () : Observable<T extends any[] ? T : T[]> {
		return this.watch().pipe(map(arr =>
			arr.reduce<any>((a, b) => a.concat(b), [])
		));
	}

	/** @inheritDoc */
	public watchPushes () : Observable<T> {
		return this.pushes.pipe(map(o => o.value));
	}

	constructor (value?: T[]) {
		super(value || []);
	}
}
