import {Writer} from 'protobufjs';


/** A Protocol Buffers class that can decode and encode the specified type. */
export interface IProto<T> {
	/** Decode from bytes. */
	decode: (bytes: Uint8Array) => T;

	/** Encode as bytes. */
	encode: (data: T) => Writer;

	/** Verify that object can be successfully encoded. */
	verify: (data: T) => any;
}
