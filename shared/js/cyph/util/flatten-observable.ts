import {
	BehaviorSubject,
	Observable,
	Observer,
	of,
	ReplaySubject,
	Subscription
} from 'rxjs';
import {Async} from '../async-type';

/** A possibly-async Observable. */
type AsyncObservable<T> =
	| Observable<T>
	| Promise<T>
	| Promise<Observable<T>>
	| Promise<Observable<T> | T>
	| (() => Observable<T>)
	| (() => Promise<T>)
	| (() => Promise<Observable<T>>)
	| (() => Promise<Observable<T> | T>);

/** @ignore */
const subscribeFactory =
	<T>(observable: AsyncObservable<T>, subscriptions?: Subscription[]) =>
	async (observer: Observer<T>) => {
		const o = await (typeof observable === 'function' ?
			observable() :
			observable);

		if (!(o instanceof Observable)) {
			observer.next(o);
			return;
		}

		const sub = o.subscribe(observer);

		if (subscriptions) {
			subscriptions.push(sub);
		}
	};

/** Wraps a possibly-async Observable with a synchronously created ReplaySubject. */
export const cacheObservable = <T>(
	observable: AsyncObservable<T>,
	subscriptions?: Subscription[]
) : Observable<T> => {
	const subscribe = subscribeFactory(observable, subscriptions);
	const subject = new ReplaySubject<T>();
	let subscribed = false;

	return new Observable<T>(observer => {
		if (!subscribed) {
			subscribed = true;
			subscribe(subject);
		}

		const sub = subject.subscribe(observer);

		if (subscriptions) {
			subscriptions.push(sub);
		}
	});
};

/** Wraps a possibly-async Observable with a synchronously created BehaviorSubject. */
export const toBehaviorSubject = <T>(
	observable: AsyncObservable<T>,
	initialValue: T,
	subscriptions?: Subscription[],
	asyncInitialValue?: Promise<T>
) : BehaviorSubject<T> => {
	const subscribe = subscribeFactory(observable, subscriptions);
	const subject = new BehaviorSubject(initialValue);

	if (asyncInitialValue) {
		asyncInitialValue.then(value => {
			subject.next(value);
			subscribe(subject);
		});
	}
	else {
		subscribe(subject);
	}

	return subject;
};

/** Wraps a possibly-async Observable with a synchronously created one. */
export const flattenObservable = <T>(
	observable: AsyncObservable<T>,
	subscriptions?: Subscription[]
) : Observable<T> => {
	const subscribe = subscribeFactory(observable, subscriptions);
	return new Observable<T>(observer => {
		subscribe(observer);
	});
};

/** Converts an Async value into an Observable. */
export const asyncToObservable = <T>(o: Async<T>) : Observable<T> =>
	o instanceof Observable ?
		o :
	o instanceof Promise ?
		flattenObservable(o) :
		of(o);
