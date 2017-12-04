import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IProto} from '../iproto';


/** Deserializes bytes to data. */
export const deserialize	= async <T> (
	proto: IProto<T>,
	bytes: Uint8Array|string
) : Promise<T> => {
	return proto.decode(potassiumUtil.fromBase64(bytes));
};

/** @see JSON.parse */
export const parse	= <T> (text: string) : T => {
	/* tslint:disable-next-line:ban */
	return JSON.parse(text, (_, v) =>
		v && v.isUint8Array && typeof v.data === 'string' ?
			potassiumUtil.fromBase64(v.data) :
			v
	);
};

/** Serializes data value to binary byte array. */
export const serialize	= async <T> (proto: IProto<T>, data: T) : Promise<Uint8Array> => {
	const err	= await proto.verify(data);
	if (err) {
		throw new Error(err);
	}
	const o	= await proto.encode(data);
	return o instanceof Uint8Array ? o : o.finish();
};

/** @see JSON.stringify */
export const stringify	= <T> (value: T) : string => {
	/* tslint:disable-next-line:ban */
	return JSON.stringify(value, (_, v) =>
		v instanceof Uint8Array ?
			{data: potassiumUtil.toBase64(v), isUint8Array: true} :
			v
	);
};

/**
 * Serializes o to a query string (cf. jQuery.param).
 * @param parent Ignore this (internal use).
 */
export const toQueryString	= (o: any, parent?: string) : string => {
	return Object.keys(o).
		map((k: string) => {
			const key: string	= parent ? `${parent}[${k}]` : k;

			return typeof o[k] === 'object' ?
				toQueryString(o[k], key) :
				`${encodeURIComponent(key)}=${encodeURIComponent(o[k])}`
			;
		}).
		join('&').
		replace(/%20/g, '+')
	;
};
