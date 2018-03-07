import {StorageUnits} from '../enums/storage-units';


const byteConversions	= {
	b: 1,
	gb: 1073741824,
	kb: 1024,
	mb: 1048576
};

/** Converts number of specified units to bytes. */
export const convertStorageUnitsToBytes	=
	(n: number, storageUnit: StorageUnits = StorageUnits.b) : number => n * (
		storageUnit === StorageUnits.kb ?
			byteConversions.kb :
		storageUnit === StorageUnits.mb ?
			byteConversions.mb :
		storageUnit === StorageUnits.gb ?
			byteConversions.gb :
			byteConversions.b
	)
;

/** Strips non-alphanumeric-or-underscore characters and converts to lowercase. */
export const normalize	= (s: string) : string => {
	return s.toLowerCase().replace(/[^0-9a-z_]/g, '');
};

/** Converts number to readable string. */
export const numberToString	= (n: number) : string =>
	n.toFixed(2).replace(/\.?0+$/, '')
;

/**
 * Converts n into a human-readable representation.
 * @param n Number of specified storage unit (bytes by default).
 * @example 32483478 -> "30.97 MB".
 */
export const readableByteLength	= (n: number, storageUnit?: StorageUnits) : string => {
	const b	= convertStorageUnitsToBytes(n, storageUnit);

	const gb	= b / byteConversions.gb;
	const mb	= b / byteConversions.mb;
	const kb	= b / byteConversions.kb;

	const o	=
		gb >= 1 ?
			{n: gb, s: 'G'} :
			mb >= 1 ?
				{n: mb, s: 'M'} :
				kb >= 1 ?
					{n: kb, s: 'K'} :
					{n: b, s: ''}
	;

	return `${numberToString(o.n)} ${o.s}B`;
};
