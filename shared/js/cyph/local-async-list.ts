import {Observable, Subject, Subscription} from 'rxjs';
import {IAsyncList} from './iasync-list';
import {LocalAsyncValue} from './local-async-value';


/**
 * IAsyncList implementation that wraps a local value.
 */
export class LocalAsyncList<T> extends LocalAsyncValue<T[]> implements IAsyncList<T> {
	/** @ignore */
	protected readonly pushes: Subject<{index: number; value: T}>	= new Subject();

	/** @inheritDoc */
	public async pushValue (value: T) : Promise<void> {
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
	public subscribeAndPop (f: (value: T) => void|Promise<void>) : Subscription {
		return this.pushes.subscribe(async ({index, value}) => {
			await f(value);
			this.value.splice(index, 1);
			this.subject.next(this.value);
		});
	}

	/** @inheritDoc */
	public watchPushes () : Observable<T> {
		return this.pushes.map(o => o.value);
	}

	constructor (value: T[]) {
		super(value);
	}
}
