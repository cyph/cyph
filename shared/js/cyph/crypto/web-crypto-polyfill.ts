import {ISodium} from 'libsodium';


/**
 * If not available natively, uses a separate CSPRNG to polyfill the Web Crypto API.
 * Used in worker threads in some browsers.
 * @param seed Securely generated 32-byte key.
 */
export const webCryptoPolyfill	= (seed: Uint8Array) => {
	try {
		crypto.getRandomValues(new Uint8Array(1));
		return;
	}
	catch (_) {}

	const nonce		= new Uint32Array(2);
	let isActive	= false;

	crypto	= {
		getRandomValues: (arrayBufferView: ArrayBufferView) => {
			/* Handle circular dependency between this polyfill and libsodium */
			if (
				typeof (<any> self).sodium !== 'undefined' &&
				(<any> self).sodium.crypto_stream_chacha20
			) {
				isActive	= true;
			}
			else if (!isActive) {
				return arrayBufferView;
			}
			else {
				throw new Error('No CSPRNG found.');
			}

			++nonce[nonce[0] === 4294967295 ? 1 : 0];

			const newBytes	= (<ISodium> (<any> self).sodium).crypto_stream_chacha20(
				arrayBufferView.byteLength,
				seed,
				new Uint8Array(nonce.buffer, nonce.byteOffset, nonce.byteLength)
			);

			new Uint8Array(
				arrayBufferView.buffer,
				arrayBufferView.byteOffset,
				arrayBufferView.byteLength
			).set(newBytes);
			(<any> self).sodium.memzero(newBytes);

			return arrayBufferView;
		},

		subtle: <SubtleCrypto> {}
	};

	(<any> self).crypto	= crypto;
};
