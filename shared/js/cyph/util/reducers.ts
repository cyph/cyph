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

/** Flattens an array of arrays into one array. */
export const flattenArray = <T>(
	arrays: (T | T[])[],
	omitDuplicates: boolean = false
) : T[] => {
	if (!omitDuplicates) {
		const array = [];
		for (const arr of arrays) {
			if (arr instanceof Array) {
				for (const t of arr) {
					array.push(t);
				}
				continue;
			}
			array.push(arr);
		}
		return array;
	}

	return arrays.reduce<{arr: T[]; seen: Map<T, true>}>(
		({arr, seen}, b) => {
			if (b instanceof Array) {
				arr = arr.concat(
					b.filter(t => {
						if (seen.has(t)) {
							return false;
						}

						seen.set(t, true);
						return true;
					})
				);
			}
			else if (!seen.has(b)) {
				seen.set(b, true);
				arr = arr.concat(b);
			}

			return {arr, seen};
		},
		{arr: [], seen: new Map<T, true>()}
	).arr;
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
