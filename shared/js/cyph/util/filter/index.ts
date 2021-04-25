import {Observable} from 'rxjs';
import {filter} from 'rxjs/operators';
import {compareValues} from '../compare';

export * from './base';

/** rxjs operator that filters out consecutive duplicate values. */
export const filterDuplicatesOperator = <T>() : ((
	source: Observable<T>
) => Observable<T>) => {
	let last: T;

	return filter<T>(value => {
		const equal = last !== undefined && compareValues(last, value);
		last = value;
		return !equal;
	});
};

/** rxjs operator that filters out falsy values. */
export const filterEmptyOperator = <T>() =>
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	<(source: Observable<T | undefined | void>) => Observable<T>> (
		filter<T>(t => !!t)
	);

/** rxjs operator that filters out undefined values. */
export const filterUndefinedOperator = <T>() =>
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	<(source: Observable<T | undefined | void>) => Observable<T>> (
		filter<T>(t => t !== undefined)
	);
