import {Writer} from 'protobufjs';


/** Any generic value that can be serialized to bytes by util.toBytes. */
export type DataType<T>	=
	ArrayBuffer|
	ArrayBufferView|
	Blob|
	boolean|
	number|
	string|
	{data: T; proto: {encode: (data: T) => Writer, verify: (data: T) => any}}
;
