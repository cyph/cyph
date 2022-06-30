/**
 * Compares two or more arrays.
 * @returns True if equal, false otherwise.
 */
export const compareArrays = <T>(
	a: T[],
	b: T[],
	...arrays: T[][]
) : boolean => {
	const length = a.length;
	arrays = arrays.concat([b]);

	if (arrays.find(arr => arr.length !== length)) {
		return false;
	}

	for (const arr of arrays) {
		for (let j = 0; j < length; ++j) {
			if (arr[j] !== a[j]) {
				return false;
			}
		}
	}

	return true;
};

/**
 * Compares two or more values.
 * @returns True if equal, false otherwise.
 */
export const compareValues = <T>(a: T, b: T, ...values: T[]) : boolean => {
	if (a instanceof Array) {
		return compareArrays(a, <any> b, ...(<any> values));
	}

	if (values.length === 0) {
		return a === b;
	}

	return values.concat(b).filter(t => t !== a).length < 1;
};

/** Constant time string comparison. */
/* eslint-disable-next-line no-null/no-null */
export const safeStringCompare = (a: string, b?: string | null) : boolean => {
	if (typeof b !== 'string') {
		return false;
	}

	let mismatch: number;

	const length = a.length;

	if (b.length === length) {
		mismatch = 0;
	}
	else {
		mismatch = 1;
		b = a;
	}

	for (let i = 0; i < length; ++i) {
		/* eslint-disable-next-line no-bitwise */
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return mismatch === 0;
};
