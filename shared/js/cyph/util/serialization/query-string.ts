/** Parses query string (no nested URI component decoding for now). */
export const fromQueryString = (
	search: string = locationData.search.slice(1)
) : any =>
	!search ?
		{} :
		search
			.split('&')
			.map(p => p.split('='))
			.reduce<any>(
				(o, [key, value]) => ({
					...o,
					[decodeURIComponent(key)]: decodeURIComponent(value)
				}),
				{}
			);

/**
 * Serializes o to a query string (cf. jQuery.param).
 * @param parent Ignore this (internal use).
 */
export const toQueryString = (o: any, parent?: string) : string =>
	Object.keys(o)
		.map((k: string) => {
			const key = parent ? `${parent}[${k}]` : k;

			return typeof o[k] === 'object' ?
				toQueryString(o[k], key) :
				`${encodeURIComponent(key)}=${encodeURIComponent(o[k])}`;
		})
		.join('&')
		.replace(/%20/g, '+');
