import {Writer} from 'protobufjs';


/** A Protocol Buffers class that can decode and encode the specified type. */
export type Proto<T>	= {
	decode: (bytes: Uint8Array) => T;
	encode: (data: T) => Writer;
	verify: (data: T) => any;
};
