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
		/* tslint:disable-next-line:no-null-keyword */
		getRandomValues: <T extends ArrayBufferView> (array?: T|null) : T => {
			if (!array) {
				throw new TypeError(
					`Failed to execute 'getRandomValues' on 'Crypto': ${
						array === null ?
							"parameter 1 is not of type 'ArrayBufferView'" :
							'1 argument required, but only 0 present'
					}.`
				);
			}

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

				return array;
			}
			else if (!sodiumExists) {
				throw new Error('No CSPRNG found.');
			}

			++nonce[nonce[0] === 4294967295 ? 1 : 0];

			const newBytes	= sodium().crypto_stream_chacha20(
				array.byteLength,
				seed,
				new Uint8Array(nonce.buffer, nonce.byteOffset, nonce.byteLength)
			);

			new Uint8Array(
				array.buffer,
				array.byteOffset,
				array.byteLength
			).set(newBytes);
			sodium().memzero(newBytes);

			return array;
		},

		subtle: <SubtleCrypto> {}
	};

	(<any> self).crypto	= crypto;
};
