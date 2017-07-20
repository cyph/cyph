import {IAsyncValue} from './iasync-value';


/** Returns a possibly-undefined async value as non-undefined. */
export const denullifyAsyncValue	=
	async <T> (asyncValue: IAsyncValue<T|undefined>) : Promise<IAsyncValue<T>> => {
		if ((await asyncValue.getValue()) === undefined) {
			throw new Error('Cannot denullify undefined async value.');
		}

		return <any> asyncValue;
	}
;
