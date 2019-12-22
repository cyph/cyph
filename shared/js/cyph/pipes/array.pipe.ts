import {Pipe, PipeTransform} from '@angular/core';

/** Converts value to array. */
@Pipe({
	name: 'cyphArray',
	pure: true
})
export class ArrayPipe implements PipeTransform {
	/** @inheritDoc */
	/* eslint-disable-next-line no-null/no-null */
	public transform<T> (value: Iterable<T> | undefined | null) : T[] {
		return value instanceof Array ?
			value :
		/* eslint-disable-next-line no-null/no-null */
			value === undefined || value === null ?
			[] :
			Array.from(value);
	}

	constructor () {}
}
