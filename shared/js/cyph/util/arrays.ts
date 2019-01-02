/** Flattens an array of arrays into one array. */
export const flattenArrays	= <T> (
	arrays: (T|T[])[],
	omitDuplicates: boolean = false
) : T[] => !omitDuplicates ?
	arrays.reduce<T[]>((a, b) => a.concat(b), []) :
	arrays.reduce<{arr: T[]; seen: Map<T, true>}>(
		({arr, seen}, b) => {
			if (b instanceof Array) {
				arr	= arr.concat(b.filter(t => {
					if (seen.has(t)) {
						return false;
					}

					seen.set(t, true);
					return true;
				}));
			}
			else if (!seen.has(b)) {
				seen.set(b, true);
				arr	= arr.concat(b);
			}

			return {arr, seen};
		},
		{arr: [], seen: new Map<T, true>()}
	).arr
;
