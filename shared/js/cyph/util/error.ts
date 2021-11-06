/** Converts maybe-Error object to string. */
export const errorToString = (err: any) : string =>
	err instanceof Error ?
		err.message :
	typeof err === 'object' &&
		err &&
		'toString' in err &&
		typeof err.toString === 'function' ?
		err.toString() :
		'[Error]';
