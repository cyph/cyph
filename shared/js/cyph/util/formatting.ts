import memoize from 'lodash-es/memoize';
import {StorageUnits} from '../enums/storage-units';

const byteConversions = {
	b: 1,
	gb: 1073741824,
	kb: 1024,
	mb: 1048576,
	tb: 1099511627776
};

/** Converts number of specified units to bytes. */
export const convertStorageUnitsToBytes = (
	n: number,
	storageUnit: StorageUnits = StorageUnits.b
) : number =>
	n *
	(storageUnit === StorageUnits.kb ?
		byteConversions.kb :
	storageUnit === StorageUnits.mb ?
		byteConversions.mb :
	storageUnit === StorageUnits.gb ?
		byteConversions.gb :
	storageUnit === StorageUnits.tb ?
		byteConversions.tb :
		byteConversions.b);

/** Determines whether value is a number. */
export const isNumber = (n: any) : boolean =>
	typeof n === 'number' && !isNaN(n);

/** Strips non-alphanumeric-or-underscore characters and converts to lowercase. */
export const normalize = memoize((s: string) : string =>
	(s || '').toLowerCase().replace(/[^0-9a-z_]/g, '')
);

const normalizeArrayInternal = memoize((arr: string[]) =>
	memoize((compareFn?: ((a: string, b: string) => number) | false) => {
		const result = Array.from(new Set(arr)).map(normalize);
		return compareFn === false ? result : result.sort(compareFn);
	})
);

/**
 * Normalizes and sorts array.
 * @param compareFn Optional comparison function for sorting. If false, result will be unsorted.
 */
export const normalizeArray = memoize(
	(
		arr: string[],
		compareFn?: ((a: string, b: string) => number) | false
	) : string[] => normalizeArrayInternal(arr)(compareFn)
);

/** Converts number to readable string. */
export const numberToString = memoize((n: number) : string =>
	n.toFixed(2).replace(/\.?0+$/, '')
);

const readableByteLengthInternal = memoize((n: number) =>
	memoize((storageUnit?: StorageUnits) : string => {
		const b = convertStorageUnitsToBytes(n, storageUnit);

		const tb = b / byteConversions.tb;
		const gb = b / byteConversions.gb;
		const mb = b / byteConversions.mb;
		const kb = b / byteConversions.kb;

		const o =
			tb >= 1 ?
				{n: tb, s: 'T'} :
			gb >= 1 ?
				{n: gb, s: 'G'} :
			mb >= 1 ?
				{n: mb, s: 'M'} :
			kb >= 1 ?
				{n: kb, s: 'K'} :
				{n: b, s: ''};

		return `${numberToString(o.n)} ${o.s}B`;
	})
);

/**
 * Converts n into a human-readable representation.
 * @param n Number of specified storage unit (bytes by default).
 * @example 32483478 -> "30.97 MB".
 */
export const readableByteLength = (
	n: number,
	storageUnit?: StorageUnits | string
) : string =>
	readableByteLengthInternal(n)(
		typeof storageUnit !== 'string' ?
			storageUnit :
		storageUnit in StorageUnits ?
			(<any> StorageUnits)[storageUnit] :
			undefined
	);

/** Rounds number. */
export const round = (n: number, decimalPlaces: number = 2) => {
	const factor = Math.pow(10, decimalPlaces);
	return Math.round(n * factor) / factor;
};

const roundToStringInternal = memoize((n: number) =>
	memoize((decimalPlaces: number) =>
		memoize((stripEmptyDecimal: boolean) => {
			const s = round(n, decimalPlaces).toFixed(decimalPlaces);
			return stripEmptyDecimal ? s.replace(/\.0+$/, '') : s;
		})
	)
);

/** Rounds number and converts to String. */
export const roundToString = (
	n: number,
	decimalPlaces: number = 2,
	stripEmptyDecimal: boolean = true
) => roundToStringInternal(n)(decimalPlaces)(stripEmptyDecimal);

/** Parses number. */
export const toFloat = (
	s: string,
	max?: number,
	min: number = 0,
	force: boolean = false
) : number => {
	if (force) {
		s = (s.match(/(\d+|\.)/g) || []).join('');
	}

	const n = s ? parseFloat(s) : NaN;

	return isNaN(n) || n <= min ? min : max !== undefined && n >= max ? max : n;
};

/** Stricter parseInt. */
export const toInt = (s: string | number | any) : number =>
	typeof s === 'number' ?
		Math.floor(s) :
	typeof s === 'string' && /^\d+$/.test(s) ?
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		parseInt(s, 10) :
		NaN;
