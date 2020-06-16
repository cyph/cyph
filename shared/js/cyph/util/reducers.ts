/** Checks whether array is all true. */
export const arrayAll = (arr: boolean[]) : boolean => arr.indexOf(false) < 0;

/** Checks whether array contains true. */
export const arrayAny = (arr: boolean[]) : boolean => arr.indexOf(true) > -1;

/** Calculates sum or array values. */
export const arraySum = (arr: number[]) : number => {
	let sum = 0;
	for (const n of arr) {
		sum += n;
	}
	return sum;
};

/** Flattens an array of arrays into one array and filters out duplicates. */
export const flattenAndOmitDuplicates = <T>(arrays: (T | T[])[]) : T[] => {
	const arr: T[] = [];
	const seen = new Set<T>();

	for (const value of arrays) {
		if (value instanceof Array) {
			for (const t of value) {
				if (seen.has(t)) {
					continue;
				}

				seen.add(t);
				arr.push(t);
			}
		}
		else if (!seen.has(value)) {
			seen.add(value);
			arr.push(value);
		}
	}

	return arr;
};

/** Flattens an array of tuples into one object. */
export const flattenObject = <K extends string | number | symbol, V>(
	arr: [K, V][]
) : Record<K, V> => {
	const o = <Record<K, V>> {};
	for (const [k, v] of arr) {
		o[k] = v;
	}
	return o;
};
