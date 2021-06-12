import {ISodium} from 'libsodium';

/**
 * If not available natively, uses a separate CSPRNG to polyfill the Web Crypto API.
 * Used in worker threads in some browsers.
 * @param seed Securely generated 32-byte key.
 */
export const webCryptoPolyfill = (seed: Uint8Array) => {
	try {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		crypto.getRandomValues(new Uint8Array(1));
		return;
	}
	catch {}

	const nonce = new Uint32Array(2);
	let isActive = false;
	const sodium = () => <ISodium> (<any> self).sodium;
	let sodiumReadyPromise: Promise<void> | undefined;

	crypto = {
		/* eslint-disable-next-line no-null/no-null */
		getRandomValues: <T extends ArrayBufferView | null>(
			/* eslint-disable-next-line no-null/no-null */
			array?: T | null
		) : T => {
			if (!array) {
				throw new TypeError(
					`Failed to execute 'getRandomValues' on 'Crypto': ${
						/* eslint-disable-next-line no-null/no-null */
						array === null ?
							"parameter 1 is not of type 'ArrayBufferView'" :
							'1 argument required, but only 0 present'
					}.`
				);
			}

			/* Handle circular dependency between this polyfill and libsodium */
			const sodiumExists =
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				typeof (<any> sodium())?.crypto_stream_chacha20 === 'function';

			if (!isActive) {
				if (sodiumExists && !sodiumReadyPromise) {
					sodiumReadyPromise = sodium().ready.then(() => {
						isActive = true;
					});
				}

				return array;
			}

			if (!sodiumExists) {
				throw new Error('No CSPRNG found.');
			}

			++nonce[nonce[0] === 4294967295 ? 1 : 0];

			const newBytes = sodium().crypto_stream_chacha20(
				array.byteLength,
				seed,
				new Uint8Array(nonce.buffer, nonce.byteOffset, nonce.byteLength)
			);

			new Uint8Array(
				array.buffer,
				array.byteOffset,
				array.byteLength
			).set(newBytes);

			return array;
		},

		subtle: <SubtleCrypto> {}
	};

	(<any> self).crypto = crypto;
};
