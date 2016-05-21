/**
 * @file Fakes out crypto object insecurely for demo purposes
 * (should ONLY ever be used by cyph.com).
 */


if (!('crypto' in self) && 'msCrypto' in self) {
	self['crypto']	= self['msCrypto'];
}

if (!('crypto' in self)) {
	crypto	= {
		getRandomValues: array => {
			const bytes: number	=
				'BYTES_PER_ELEMENT' in array ?
					array['BYTES_PER_ELEMENT'] :
					4
			;

			const max: number	= Math.pow(2, bytes * 8) - 1;

			for (let i = 0 ; i < array['length'] ; ++i) {
				array[i]	= Math.floor(Math.random() * max);
			}

			return array;
		},

		subtle: null
	};
}

if (!('Uint8Array' in self)) {
	self['Float32Array']		= Array;
	self['Float64Array']		= Array;
	self['Int8Array']			= Array;
	self['Int16Array']			= Array;
	self['Int32Array']			= Array;
	self['Uint8Array']			= Array;
	self['Uint16Array']			= Array;
	self['Uint32Array']			= Array;
	self['Uint8ClampedArray']	= Array;
}

if (!('ntru' in self)) {
	self['ntru']	= {};
}

if (!('sodium' in self)) {
	self['sodium']	= {
		randombytes_buf: (n: number) => crypto.getRandomValues(new Uint8Array(n))
	};
}

if (!('superSphincs' in self)) {
	self['superSphincs']	= {};
}
