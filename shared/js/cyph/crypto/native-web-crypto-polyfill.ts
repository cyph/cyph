/**
 * @file Web Crypto API polyfill for NativeScript.
 */


import {isAndroid, isIOS} from 'tns-core-modules/platform';


let getRandomByte: () => number;

if (isAndroid) {
	const secureRandom	= new java.security.SecureRandom();
	getRandomByte		= () => secureRandom.nextInt(256);
}
else if (isIOS) {
	getRandomByte		= () => arc4random_uniform(256);
}
else {
	throw new Error('Crypto polyfill not implemented for this platform.');
}

crypto	= {
	getRandomValues: (arrayBufferView: ArrayBufferView) => {
		const bytes	= new Uint8Array(arrayBufferView.buffer);

		for (let i = 0 ; i < bytes.length ; ++i) {
			bytes[i]	= getRandomByte();
		}

		return arrayBufferView;
	},

	subtle: <SubtleCrypto> {}
};

(<any> self).crypto	= crypto;
