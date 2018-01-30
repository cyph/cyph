/** Strips non-alphanumeric-or-underscore characters and converts to lowercase. */
export const normalize	= (s: string) : string => {
	return s.toLowerCase().replace(/[^0-9a-z_]/g, '');
};

/** Converts number to readable string. */
export const numberToString	= (n: number) : string =>
	n.toFixed(2).replace(/\.?0+$/, '')
;

/**
 * Converts b into a human-readable representation.
 * @param b Number of bytes.
 * @example 32483478 -> "30.97 MB".
 */
export const readableByteLength	= (b: number) : string => {
	const gb: number	= b / 1.074e+9;
	const mb: number	= b / 1.049e+6;
	const kb: number	= b / 1024;

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
