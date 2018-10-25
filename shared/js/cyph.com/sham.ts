/**
 * @file Fakes out stuff insecurely for demo purposes.
 */


/* Crypto sham */

if (!('crypto' in self) && 'msCrypto' in self) {
	(<any> self).crypto	= (<any> self).msCrypto;
}

if (!('crypto' in self)) {
	(<any> self).crypto	= {
		getRandomValues: (array: number[]|Uint8Array) => {
			const bytes: number	=
				array instanceof Array ?
					4 :
					array.BYTES_PER_ELEMENT
			;

			const max: number	= Math.pow(2, bytes * 8) - 1;

			for (let i = 0 ; i < array.length ; ++i) {
				/* tslint:disable-next-line:ban insecure-random */
				array[i]	= Math.floor(Math.random() * max);
			}

			return array;
		},

		subtle: undefined
	};
}

if (!('Uint8Array' in self)) {
	(<any> self).Float32Array		= Array;
	(<any> self).Float64Array		= Array;
	(<any> self).Int8Array			= Array;
	(<any> self).Int16Array			= Array;
	(<any> self).Int32Array			= Array;
	(<any> self).Uint8Array			= Array;
	(<any> self).Uint16Array		= Array;
	(<any> self).Uint32Array		= Array;
	(<any> self).Uint8ClampedArray	= Array;
}


/* Worker sham */

if (!('Worker' in self)) {
	(<any> self).Worker	= true;
}
