/** Any generic value that can be serialized to bytes by util.toBytes. */
export type DataType	=
	ArrayBuffer|
	ArrayBufferView|
	Blob|
	boolean|
	number|
	string|
	{[k: string]: any}
;
