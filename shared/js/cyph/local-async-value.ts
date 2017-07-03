import {potassiumUtil} from './crypto/potassium/potassium-util';
import {IAsyncValue} from './iasync-value';


/**
 * IAsyncValue implementation that wraps a local value.
 */
export class LocalAsyncValue<T> implements IAsyncValue<T> {
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
	}

	constructor (
		/** @ignore */
		private value: T
	) {}
}
