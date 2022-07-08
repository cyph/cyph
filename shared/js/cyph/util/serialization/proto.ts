import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IProto} from '../../iproto';

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
