import {Lib} from './lib';


/** Equivalent to sodium.crypto_sign. */
export class Sign {
	/** Signature length. */
	public readonly bytes: number			= Lib.superSphincs.bytes;

	/** Private key length. */
	public readonly privateKeyBytes: number	= Lib.superSphincs.privateKeyBytes;

	/** Public key length. */
	public readonly publicKeyBytes: number	= Lib.superSphincs.publicKeyBytes;

	/** Generates key pair. */
	public async keyPair () : Promise<{
		keyType: string;
		privateKey: Uint8Array;
		publicKey: Uint8Array;
	}> {
		return Lib.superSphincs.keyPair();
	}

	/** Verifies combined signature and returns original message. */
	public async open (
		signed: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<string> {
		return Lib.superSphincs.open(signed, publicKey);
	}

	/** Signs message and returns it combined with signature. */
	public async sign (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string> {
		return Lib.superSphincs.sign(message, privateKey);
	}

	/** Signs message and returns only the signature. */
	public async signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string> {
		return Lib.superSphincs.signDetached(message, privateKey);
	}

	/** Verifies signature. */
	public async verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<boolean> {
		return Lib.superSphincs.verifyDetached(signature, message, publicKey);
	}

	constructor () {}
}
