import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {flattenObject} from '../reducers';

const stringifyInternal = <T>(value: T, space?: string) : string => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	return JSON.stringify(
		value,
		(k, v: unknown) =>
			k !== 'errorObject' && v instanceof Error ?
				{errorObject: v, errorString: v.toString()} :
			v instanceof Uint8Array ?
				{data: potassiumUtil.toBase64(v), isUint8Array: true} :
			/* Workaround for JSON.stringify handling of Node.js Buffer objects */
				typeof v === 'object' &&
			v !== null &&
			'type' in v &&
			(<any> v).type === 'Buffer' &&
			'data' in v &&
			(<any> v).data instanceof Array ?
				{
					data: potassiumUtil.toBase64(
						new Uint8Array(<number[]> (<any> v).data)
					),
					isUint8Array: true
				} :
			v instanceof Map ?
				{
					data: flattenObject(Array.from(v.entries())),
					isMap: true
				} :
				v,
		space
	);
};

/** @see JSON.parse */
export const parse = <T>(text: string) : T => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	return JSON.parse(text, (_, v) =>
		v && v.isUint8Array === true && typeof v.data === 'string' ?
			potassiumUtil.fromBase64(v.data) :
		v && v.isMap === true && typeof v.data === 'object' ?
			new Map<any, any>(
				<any> Object.keys(v.data).map(k => [k, v.data[k]])
			) :
			v
	);
};

/** Pretty prints an object. */
export const prettyPrint = <T>(value: T) : string =>
	stringifyInternal(value, '\t');

/** @see JSON.stringify */
/* eslint-disable-next-line @typescript-eslint/tslint/config */
export const stringify = <T>(value: T) : string => stringifyInternal(value);
