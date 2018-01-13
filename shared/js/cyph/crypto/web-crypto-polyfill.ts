import {ISodium} from 'libsodium';


/**
 * If not available natively, uses a separate CSPRNG to polyfill the Web Crypto API.
 * Used in worker threads in some browsers.
 * @param seed Securely generated 32-byte key.
 */
export const webCryptoPolyfill	= (seed: Uint8Array) => {
	try {
		/* tslint:disable-next-line:ban */
		crypto.getRandomValues(new Uint8Array(1));
		return;
	}
	catch {}

	const nonce		= new Uint32Array(2);
	let isActive	= false;
	const sodium	= () => <ISodium> (<any> self).sodium;
	let sodiumReadyPromise: Promise<void>|undefined;

	crypto	= {
		getRandomValues: <T extends
			Int8Array|
			Int16Array|
			Int32Array|
			Uint8Array|
			Uint16Array|
			Uint32Array|
			Uint8ClampedArray
		> (arrayBufferView: T) : T => {
			/* Handle circular dependency between this polyfill and libsodium */
			const sodiumExists	=
				typeof (<any> sodium()) !== 'undefined' &&
				sodium().crypto_stream_chacha20
			;

			if (!isActive) {
				if (sodiumExists && !sodiumReadyPromise) {
					sodiumReadyPromise	= sodium().ready.then(() => {
						isActive	= true;
					});
				}

				return arrayBufferView;
			}
			else if (!sodiumExists) {
				throw new Error('No CSPRNG found.');
			}

			++nonce[nonce[0] === 4294967295 ? 1 : 0];

			const newBytes	= sodium().crypto_stream_chacha20(
				arrayBufferView.byteLength,
				seed,
				new Uint8Array(nonce.buffer, nonce.byteOffset, nonce.byteLength)
			);

			new Uint8Array(
				arrayBufferView.buffer,
				arrayBufferView.byteOffset,
				arrayBufferView.byteLength
			).set(newBytes);
			sodium().memzero(newBytes);

			return arrayBufferView;
		},

		subtle: <SubtleCrypto> {}
	};

	(<any> self).crypto	= crypto;
};
