import {Writer} from 'protobufjs';


/** A Protocol Buffers class that can decode and encode the specified type. */
export interface IProto<T> {
	/** Creates a default instance. */
	create: () => T;

	/** Decode from bytes. */
	decode: (bytes: Uint8Array) => T;

	/** Encode as bytes. */
	encode: (data: T) => Writer|Uint8Array;

	/** Verify that object can be successfully encoded. */
	verify: (data: T) => any;
}
