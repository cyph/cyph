import {Proto} from './proto-type';


/** Any generic value that can be serialized to bytes by util.toBytes. */
export type DataType<T>	=
	ArrayBuffer|
	ArrayBufferView|
	Blob|
	boolean|
	number|
	string|
	{data: T; proto: Proto<T>}
;
