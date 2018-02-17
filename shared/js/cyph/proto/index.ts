/* tslint:disable:variable-name */

import {Internal} from '../../proto';
import {IProto} from '../iproto';
import {GenericArrayProto} from './generic-array-proto';
import {GenericMapProto} from './generic-map-proto';
import {GenericProto} from './generic-proto';


export * from '../../proto';
export * from './binary-proto';
export * from './blob-proto';
export * from './channel-incoming-messages-proto';
export * from './data-uri-proto';
export * from './maybe-binary-proto';


/** Boolean array encoder/decoder. */
export const BooleanArrayProto: IProto<boolean[]>				=
	new GenericArrayProto(Internal.BooleanArray)
;

/** Boolean map encoder/decoder. */
export const BooleanMapProto: IProto<{[k: string]: boolean}>	=
	new GenericMapProto(Internal.BooleanMap)
;

/** Boolean encoder/decoder. */
export const BooleanProto: IProto<boolean>						=
	new GenericProto(Internal.BooleanValue)
;

/** Number array encoder/decoder. */
export const NumberArrayProto: IProto<number[]>					=
	new GenericArrayProto(Internal.NumberArray)
;

/** Number encoder/decoder. */
export const NumberProto: IProto<number>						=
	new GenericProto(Internal.NumberValue)
;

/** String array encoder/decoder. */
export const StringArrayProto: IProto<string[]>					=
	new GenericArrayProto(Internal.StringArray)
;

/** String map encoder/decoder. */
export const StringMapProto: IProto<{[k: string]: string}>		=
	new GenericMapProto(Internal.StringMap)
;

/** String encoder/decoder. */
export const StringProto: IProto<string>						=
	new GenericProto(Internal.StringValue)
;

/** Uint32 array encoder/decoder. */
export const Uint32ArrayProto: IProto<number[]>					=
	new GenericArrayProto(Internal.Uint32Array)
;

/** Uint32 encoder/decoder. */
export const Uint32Proto: IProto<number>						=
	new GenericProto(Internal.Uint32Value)
;
