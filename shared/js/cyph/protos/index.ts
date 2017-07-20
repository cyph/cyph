/* tslint:disable:variable-name */

import {
	BooleanArray,
	BooleanValue,
	NumberArray,
	NumberValue,
	StringArray,
	StringValue,
	Uint32Array,
	Uint32Value
} from '../../proto';
import {IProto} from '../iproto';
import {GenericArrayProto} from './generic-array-proto';
import {GenericProto} from './generic-proto';


export * from './binary-proto';
export * from './blob-proto';
export * from './channel-incoming-messages-proto';
export * from './data-uri-proto';
export * from './maybe-binary-proto';


/** Boolean array encoder/decoder. */
export const BooleanArrayProto: IProto<boolean[]>	= new GenericArrayProto(BooleanArray);

/** Boolean encoder/decoder. */
export const BooleanProto: IProto<boolean>			= new GenericProto(BooleanValue);

/** Number array encoder/decoder. */
export const NumberArrayProto: IProto<number[]>		= new GenericArrayProto(NumberArray);

/** Number encoder/decoder. */
export const NumberProto: IProto<number>			= new GenericProto(NumberValue);

/** String array encoder/decoder. */
export const StringArrayProto: IProto<string[]>		= new GenericArrayProto(StringArray);

/** String encoder/decoder. */
export const StringProto: IProto<string>			= new GenericProto(StringValue);

/** Uint32 array encoder/decoder. */
export const Uint32ArrayProto: IProto<number[]>		= new GenericArrayProto(Uint32Array);

/** Uint32 encoder/decoder. */
export const Uint32Proto: IProto<number>			= new GenericProto(Uint32Value);
