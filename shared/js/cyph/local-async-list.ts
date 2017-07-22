import {Observable, Subject} from 'rxjs';
import {IAsyncList} from './iasync-list';
import {LocalAsyncValue} from './local-async-value';


/**
 * IAsyncList implementation that wraps a local value.
 */
export class LocalAsyncList<T> extends LocalAsyncValue<T[]> implements IAsyncList<T> {
	/** @ignore */
	protected readonly pushes: Subject<T>	= new Subject();

	/** @inheritDoc */
	public async pushValue (value: T) : Promise<void> {
		this.value.push(value);
		this.pushes.next(value);
	}

	/** @inheritDoc */
	public async setValue (value: T[]) : Promise<void> {
		await super.setValue(value);
		for (const v of value) {
			this.pushes.next(v);
		}
	}

	/** @inheritDoc */
	public watchPushes () : Observable<T> {
		return this.pushes;
	}

	constructor (value: T[]) {
		super(value);
	}
}
