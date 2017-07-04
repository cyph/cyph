import {BehaviorSubject, Observable} from 'rxjs';
import {potassiumUtil} from './crypto/potassium/potassium-util';
import {IAsyncValue} from './iasync-value';
import {LockFunction} from './lock-function-type';
import {util} from './util';


/**
 * IAsyncValue implementation that wraps a local value.
 */
export class LocalAsyncValue<T> implements IAsyncValue<T> {
	/** @ignore */
	private readonly subject: BehaviorSubject<T>	= new BehaviorSubject(this.value);

	/** @inheritDoc */
	public readonly lock: LockFunction	= util.lockFunction();

	/** @inheritDoc */
	public async getValue () : Promise<T> {
		return this.value;
	}

	/** @inheritDoc */
	public async setValue (newValue: T) : Promise<void> {
		if (ArrayBuffer.isView(this.value)) {
			potassiumUtil.clearMemory(this.value);
		}

		this.value	= newValue;
		this.subject.next(this.value);
	}

	/** @inheritDoc */
	public watch () : Observable<T> {
		/* <any> is temporary workaround for https://github.com/ReactiveX/rxjs/issues/2539 */
		return <any> this.subject;
	}

	constructor (
		/** @ignore */
		private value: T
	) {}
}
