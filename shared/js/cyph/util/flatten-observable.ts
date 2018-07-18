import {BehaviorSubject, Observable, Observer, ReplaySubject} from 'rxjs';


/** A possibly-async Observable. */
type AsyncObservable<T>	=
	Observable<T>|
	Promise<T>|
	Promise<Observable<T>>|
	Promise<Observable<T>|T>|
	(() => Observable<T>)|
	(() => Promise<T>)|
	(() => Promise<Observable<T>>)|
	(() => Promise<Observable<T>|T>)
;

/** @ignore */
const subscribeFactory	= <T> (observable: AsyncObservable<T>) => async (observer: Observer<T>) => {
	const o	= await (typeof observable === 'function' ? observable() : observable);

	if (o instanceof Observable) {
		o.subscribe(observer);
	}
	else {
		observer.next(o);
	}
};

/** Wraps a possibly-async Observable with a synchronously created ReplaySubject. */
export const cacheObservable	= <T> (observable: AsyncObservable<T>) : Observable<T> => {
	const subscribe	= subscribeFactory(observable);
	const subject	= new ReplaySubject<T>();
	subscribe(subject);
	return subject;
};

/** Wraps a possibly-async Observable with a synchronously created BehaviorSubject. */
export const toBehaviorSubject	= <T> (
	observable: AsyncObservable<T>,
	initialValue: T
) : BehaviorSubject<T> => {
	const subscribe	= subscribeFactory(observable);
	const subject	= new BehaviorSubject(initialValue);
	subscribe(subject);
	return subject;
};

/** Wraps a possibly-async Observable with a synchronously created one. */
export const flattenObservable	= <T> (observable: AsyncObservable<T>) : Observable<T> => {
	const subscribe	= subscribeFactory(observable);
	return new Observable<T>(observer => { subscribe(observer); });
};
