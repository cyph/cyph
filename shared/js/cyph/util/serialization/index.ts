import * as msgpack from 'msgpack-lite';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IProto} from '../../iproto';

export * from './json';
export * from './query-string';

/** Deserializes bytes to data. */
export const deserialize = async <T>(
	proto: IProto<T>,
	bytes: Uint8Array | string
) : Promise<T> => {
	return proto.decode(potassiumUtil.fromBase64(bytes));
};

/** Serializes data value to binary byte array. */
export const serialize = async <T>(
	proto: IProto<T>,
	data: T
) : Promise<Uint8Array> => {
	const err = await proto.verify(data);
	if (err) {
		throw new Error(err);
	}
	const o = await proto.encode(data);
	return o instanceof Uint8Array ? o : o.finish();
};

/** Deserializes arbitrary data from a base64 string. */
export const dynamicDeserialize = (bytes: Uint8Array | string) : any => {
	const o = msgpack.decode(potassiumUtil.fromBase64(bytes));
	/* eslint-disable-next-line no-null/no-null */
	return o === null ? undefined : o;
};

/** Serializes arbitrary data to a base64 string. */
export const dynamicSerialize = (data: any) : string =>
	potassiumUtil.toBase64(msgpack.encode(data));
