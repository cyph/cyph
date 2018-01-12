import {Writer} from 'protobufjs';
import {MaybePromise} from './maybe-promise-type';


/** A Protocol Buffers class that can decode and encode the specified type. */
export interface IProto<T> {
	/** Creates a default instance. */
	create: () => T;

	/** Decode from bytes. */
	decode: (bytes: Uint8Array) => MaybePromise<T>;

	/** Encode as bytes. */
	encode: (data: T) => MaybePromise<Uint8Array|Writer>;

	/** Verify that object can be successfully encoded. */
	verify: (data: any) => any;
}
