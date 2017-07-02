import {IAsyncValue} from '../iasync-value';
import {potassiumUtil} from './potassium/potassium-util';


/**
 * An asynchronous ArrayBufferView value.
 */
export class AsyncBytes<T extends ArrayBufferView|undefined> implements IAsyncValue<T> {
	/** @inheritDoc */
	public async getValue () : Promise<T> {
		return this.bytes;
	}

	/** @inheritDoc */
	public async setValue (newBytes: T) : Promise<void> {
		if (ArrayBuffer.isView(this.bytes)) {
			potassiumUtil.clearMemory(this.bytes);
		}

		this.bytes	= newBytes;
	}

	constructor (
		/** @ignore */
		private bytes: T
	) {}
}
