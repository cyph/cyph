import {BehaviorSubject} from 'rxjs/BehaviorSubject';


/** A function that performs locking. */
export type LockFunction	=
	<T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) => Promise<T>
;
