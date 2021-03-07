/* eslint-disable */

/** @file quill external. */

export interface Key {
	key: string | number;
	shortKey?: boolean;
}

export interface StringMap {
	[key: string]: any;
}

export interface OptionalAttributes {
	attributes?: StringMap;
}

export type DeltaOperation = {
	insert?: any;
	delete?: number;
	retain?: number;
} & OptionalAttributes;

export interface Delta {
	ops: any[];
	changeLength () : number;
	chop () : this;
	compose (other: Delta) : Delta;
	concat (other: Delta) : Delta;
	delete (length: number) : this;
	diff (other: Delta, cursor?: any) : Delta;
	eachLine (
		predicate: (
			line: Delta,
			attributes: any,
			index: number
		) => boolean | void,
		newline?: string
	) : void;
	filter (predicate: (op: any, index: number) => boolean) : any[];
	forEach (predicate: (op: any, index: number) => void) : void;
	insert (arg: string | object, attributes?: any) : this;
	invert (base: Delta) : Delta;
	length () : number;
	map<T> (predicate: (op: any, index: number) => T) : T[];
	partition (predicate: (op: any) => boolean) : [any[], any[]];
	push (newOp: any) : this;
	reduce<T> (
		predicate: (accum: T, curr: any, index: number) => T,
		initialValue: T
	) : T;
	retain (length: number, attributes?: any) : this;
	slice (start?: number, end?: number) : Delta;
	transform (index: number, priority?: boolean) : number;
	transform (other: Delta, priority?: boolean) : Delta;
	transformPosition (index: number, priority?: boolean) : number;
}

export interface RangeStatic {
	index: number;
	length: number;
}

export type Sources = 'api' | 'user' | 'silent';

export type TextChangeHandler = (
	delta: Delta,
	oldContents: Delta,
	source: Sources
) => any;
export type SelectionChangeHandler = (
	range: RangeStatic,
	oldRange: RangeStatic,
	source: Sources
) => any;
export type EditorChangeHandler =
	| ((
			name: 'text-change',
			delta: Delta,
			oldContents: Delta,
			source: Sources
	  ) => any)
	| ((
			name: 'selection-change',
			range: RangeStatic,
			oldRange: RangeStatic,
			source: Sources
	  ) => any);

export interface Quill {
	disable () : void;
	enable () : void;
	off (eventName: 'text-change', handler: TextChangeHandler) : any;
	off (eventName: 'selection-change', handler: SelectionChangeHandler) : any;
	off (eventName: 'editor-change', handler: EditorChangeHandler) : any;
	on (eventName: 'text-change', handler: TextChangeHandler) : any;
	on (eventName: 'selection-change', handler: SelectionChangeHandler) : any;
	on (eventName: 'editor-change', handler: EditorChangeHandler) : any;
	once (eventName: 'text-change', handler: TextChangeHandler) : any;
	once (eventName: 'selection-change', handler: SelectionChangeHandler) : any;
	once (eventName: 'editor-change', handler: EditorChangeHandler) : any;
	setContents (delta: Delta, source?: Sources) : Delta;
	setSelection (index: number, length: number, source?: Sources) : void;
	setSelection (range: RangeStatic, source?: Sources) : void;
	updateContents (delta: Delta, source?: Sources) : Delta;
}

export default <any> {};
