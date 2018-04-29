import {BehaviorSubject} from 'rxjs';
import {LockFunction} from '../lock-function-type';
import {uuid} from './uuid';
import {resolvable} from './wait';


/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
export const lock	= async <T> (
	mutex: {promise?: Promise<any>; queue?: string[]; reason?: string},
	f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
	reason?: string
) : Promise<T> => {
	if (mutex.queue === undefined) {
		mutex.queue	= [];
	}

	const queue	= mutex.queue;
	const id	= uuid();

	queue.push(id);

	while (queue[0] !== id) {
		await mutex.promise;
	}

	const lastReason	= mutex.reason;
	mutex.reason		= reason;

	const releaseLock	= resolvable();
	mutex.promise		= releaseLock.promise;

	try {
		return await f({reason: lastReason, stillOwner: new BehaviorSubject(true)});
	}
	finally {
		queue.shift();
		releaseLock.resolve();
	}
};

/** Creates and returns a lock function that uses util/lock. */
export const lockFunction	= () : LockFunction => {
	const mutex	= {};
	return async <T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) =>
		lock(mutex, f, reason)
	;
};

/**
 * Executes a Promise within a mutual-exclusion lock, but
 * will give up after first failed attempt to obtain lock.
 * @returns Whether or not the lock was obtained.
 */
export const lockTryOnce	= async (
	mutex: {queue?: string[]},
	f: () => Promise<void>
) : Promise<boolean> => {
	if (mutex.queue === undefined || mutex.queue.length < 1) {
		await lock(mutex, f);
		return true;
	}
	return false;
};
