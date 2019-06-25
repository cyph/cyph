/* tslint:disable:no-async-without-await */

import {BehaviorSubject, Observable} from 'rxjs';
import {potassiumUtil} from './crypto/potassium/potassium-util';
import {IAsyncValue} from './iasync-value';
import {lockFunction} from './util/lock';


/**
 * IAsyncValue implementation that wraps a local value.
 */
export class LocalAsyncValue<T> implements IAsyncValue<T> {
	/** @inheritDoc */
	public readonly lock	= lockFunction();

	/** @ignore */
	public readonly subject	= new BehaviorSubject<T>(this.value);

	/** @ignore */
	public setValueInternal (newValue: T, emit: boolean = true) : void {
		if (ArrayBuffer.isView(this.value)) {
			potassiumUtil.clearMemory(this.value);
		}
		else if (this.value instanceof Array) {
			for (const v of this.value) {
				if (ArrayBuffer.isView(v)) {
					potassiumUtil.clearMemory(v);
				}
			}
		}

		this.value	= newValue;

		if (emit) {
			this.subject.next(this.value);
		}
	}

	/** @inheritDoc */
	public async getValue () : Promise<T> {
		return this.value;
	}

	/** @inheritDoc */
	public async setValue (newValue: T) : Promise<void> {
		this.setValueInternal(newValue);
	}

	/** @inheritDoc */
	public async updateValue (f: (value: T) => Promise<T>) : Promise<void> {
		await this.lock(async () => {
			try {
				this.setValueInternal(await f(this.value));
			}
			catch {}
		});
	}

	/** @inheritDoc */
	public watch () : Observable<T> {
		return this.subject;
	}

	constructor (
		/** @ignore */
		public value: T
	) {}
}
