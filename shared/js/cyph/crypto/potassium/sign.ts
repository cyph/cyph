import {IKeyPair} from '../ikey-pair';


/** Equivalent to sodium.crypto_sign. */
export class Sign {
	/** Signature length. */
	public readonly bytes: number			= superSphincs.bytes;

	/** Private key length. */
	public readonly privateKeyBytes: number	= superSphincs.privateKeyBytes;

	/** Public key length. */
	public readonly publicKeyBytes: number	= superSphincs.publicKeyBytes;

	/** Generates key pair. */
	public async keyPair () : Promise<IKeyPair> {
		return superSphincs.keyPair();
	}

	/** Verifies combined signature and returns original message. */
	public async open (
		signed: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<string> {
		return superSphincs.open(signed, publicKey);
	}

	/** Signs message and returns it combined with signature. */
	public async sign (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string> {
		return superSphincs.sign(message, privateKey);
	}

	/** Signs message and returns only the signature. */
	public async signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string> {
		return superSphincs.signDetached(message, privateKey);
	}

	/** Verifies signature. */
	public async verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<boolean> {
		return superSphincs.verifyDetached(signature, message, publicKey);
	}

	constructor () {}
}
