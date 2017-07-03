/** A function that performs locking. */
export type LockFunction	=
	<T> (f: (reason?: string) => Promise<T>, reason?: string) => Promise<T>
;
