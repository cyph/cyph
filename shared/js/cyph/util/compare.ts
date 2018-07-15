import {potassiumUtil} from '../crypto/potassium/potassium-util';


/**
 * Compares two or more arrays.
 * @returns True if equal, false otherwise.
 */
export const compareArrays	= <T> (a: T[], b: T[], ...arrays: T[][]) : boolean => {
	const length	= a.length;
	arrays			= arrays.concat([b]);

	if (arrays.find(arr => arr.length !== length)) {
		return false;
	}

	for (const arr of arrays) {
		for (let j = 0 ; j < length ; ++j) {
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
export const compareValues	= <T> (a: T, b: T, ...values: T[]) : boolean => {
	if (a instanceof Array) {
		return compareArrays(a, <any> b, ...(<any> values));
	}
	else if (values.length === 0) {
		return a === b;
	}
	else {
		return values.concat(b).filter(t => t !== a).length < 1;
	}
};

/** Constant time string comparison. */
export const safeStringCompare	= (a: string, b: string) : boolean => {
	if (a.length !== b.length) {
		return false;
	}

	const aBytes	= potassiumUtil.fromString(a);
	const bBytes	= potassiumUtil.fromString(b);

	try {
		return potassiumUtil.compareMemory(aBytes, bBytes);
	}
	finally {
		potassiumUtil.clearMemory(aBytes);
		potassiumUtil.clearMemory(bBytes);
	}
};
