import {Observable} from 'rxjs';
import {filter} from 'rxjs/operators';
import {compareValues} from './compare';


/** rxjs operator that filters out consecutive duplicate values. */
export const filterDuplicatesOperator	= <T> () : (source: Observable<T>) => Observable<T> => {
	let last: T;

	return filter<T>(value => {
		const equal	= last !== undefined && compareValues(last, value);
		last		= value;
		return !equal;
	});
};

/** Filters out undefined values. */
export const filterUndefined			= <T> (arr: (T|undefined)[]) : T[] =>
	<T[]> arr.filter(t => t !== undefined)
;

/** rxjs operator that filters out undefined values. */
export const filterUndefinedOperator	=
	<T> () => <(source: Observable<T|undefined>) => Observable<T>> filter<T>(t => t !== undefined)
;
