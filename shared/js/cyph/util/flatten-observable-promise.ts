import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';


/**
 * Wraps an async Observable with a synchronously created one.
 * @param initialValue If included, will create a BehaviorSubject instead (for caching).
 */
export const flattenObservablePromise	= <T> (
	observable:
		Observable<T>|
		Promise<Observable<T>>|
		(() => Observable<T>)|
		(() => Promise<Observable<T>>)
	,
	initialValue?: T
) : Observable<T> => {
	const subscribe	= async (observer: Observer<T>) =>
		(
			await (typeof observable === 'function' ? observable() : observable)
		).subscribe(
			observer
		)
	;

	if (initialValue) {
		const subject	= new BehaviorSubject(initialValue);
		subscribe(subject);
		return subject;
	}
	else {
		return new Observable<T>(observer => { subscribe(observer); });
	}
};
