/**
 * @file Fakes out crypto object insecurely for demo purposes
 * (should ONLY ever be used by cyph.com).
 */


if (!('crypto' in self) && 'msCrypto' in self) {
	(<any> self).crypto	= (<any> self).msCrypto;
}

if (!('crypto' in self)) {
	(<any> self).crypto	= {
		getRandomValues: array => {
			const bytes: number	=
				'BYTES_PER_ELEMENT' in array ?
					array.BYTES_PER_ELEMENT :
					4
			;

			const max: number	= Math.pow(2, bytes * 8) - 1;

			for (let i = 0 ; i < array.length ; ++i) {
				array[i]	= Math.floor(Math.random() * max);
			}

			return array;
		},

		subtle: null
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
