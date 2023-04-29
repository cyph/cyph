import {
	decode,
	Decoder,
	encode,
	Encoder,
	ExtensionCodec
} from '@msgpack/msgpack';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';

const msgpackHandlers = [
	{
		decode: (_BYTES: Uint8Array) => {},
		encode: (o: unknown) =>
			/* eslint-disable-next-line no-null/no-null */
			typeof o === 'function' ? encode(undefined) : null
	},
	{
		decode: (bytes: ArrayLike<number> | BufferSource) => {
			const s = decode(bytes);
			return typeof s === 'string' ? new RegExp(s) : undefined;
		},
		encode: (o: unknown) =>
			/* eslint-disable-next-line no-null/no-null */
			o instanceof RegExp ? encode(o.toString().slice(1, -1)) : null
	},
	{
		decode: (bytes: ArrayLike<number> | BufferSource) => {
			const arr = decode(bytes);
			return new Set(arr instanceof Array ? arr : []);
		},
		encode: (o: unknown) : Uint8Array | null =>
			/* eslint-disable-next-line no-null/no-null */
			o instanceof Set ? encode(Array.from(o)) : null
	},
	{
		decode: (bytes: ArrayLike<number> | BufferSource) => {
			const arr = decode(bytes);
			return new Map(arr instanceof Array ? arr : []);
		},
		encode: (o: unknown) =>
			/* eslint-disable-next-line no-null/no-null */
			o instanceof Map ? encode(Array.from(o.entries())) : null
	}
];

const extensionCodec = new ExtensionCodec();
for (let i = 0; i < msgpackHandlers.length; ++i) {
	extensionCodec.register({type: i, ...msgpackHandlers[i]});
}

const decoder = new Decoder({extensionCodec});
const encoder = new Encoder({extensionCodec});

/** Deserializes arbitrary data from a base64 string or bytes. */
export const dynamicDeserialize = (bytes: Uint8Array | string) : any => {
	const o = decoder.decode(potassiumUtil.fromBase64(bytes));
	/* eslint-disable-next-line no-null/no-null */
	return o === null ? undefined : o;
};

/** Serializes arbitrary data to bytes. */
export const dynamicSerializeBytes = (data: any) : Uint8Array =>
	new Uint8Array(encoder.encode(data));

/** Serializes arbitrary data to a base64 string. */
export const dynamicSerialize = (data: any) : string =>
	potassiumUtil.toBase64(dynamicSerializeBytes(data));
