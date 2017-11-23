/**
 * Compares two or more arrays.
 * @returns True if equal, false otherwise.
 */
export const compareArrays	= <T> (...arrays: T[][]) : boolean => {
	if (arrays.length < 2) {
		return false;
	}

	const length	= arrays[0].length;

	if (arrays.filter(arr => arr.length !== length).length > 0) {
		return false;
	}

	for (let i = 1 ; i < arrays.length ; ++i) {
		for (let j = 0 ; j < length ; ++j) {
			if (arrays[i][j] !== arrays[0][j]) {
				return false;
			}
		}
	}

	return true;
};
