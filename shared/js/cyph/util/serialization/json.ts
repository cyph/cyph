import {potassiumUtil} from '../../crypto/potassium/potassium-util';


const stringifyInternal	= <T> (value: T, space?: string) : string => {
	/* tslint:disable-next-line:ban */
	return JSON.stringify(
		value,
		(_, v) =>
			v instanceof Uint8Array ?
				{data: potassiumUtil.toBase64(v), isUint8Array: true} :
			v instanceof Map ?
				{
					data: Array.from(v.keys()).reduce((o, k) => ({...o, [k]: v.get(k)}), {}),
					isMap: true
				} :
			v
		,
		space
	);
};

/** @see JSON.parse */
export const parse	= <T> (text: string) : T => {
	/* tslint:disable-next-line:ban */
	return JSON.parse(text, (_, v) =>
		v && v.isUint8Array === true && typeof v.data === 'string' ?
			potassiumUtil.fromBase64(v.data) :
		v && v.isMap === true && typeof v.data === 'object' ?
			new Map(<any> Object.keys(v.data).map(k => [k, v.data[k]])) :
			v
	);
};

/** Pretty prints an object. */
export const prettyPrint	= <T> (value: T) : string =>
	stringifyInternal(value, '\t')
;

/** @see JSON.stringify */
/* tslint:disable-next-line:no-unnecessary-callback-wrapper */
export const stringify	= <T> (value: T) : string =>
	stringifyInternal(value)
;
