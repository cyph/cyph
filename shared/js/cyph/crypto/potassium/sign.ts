import {superSphincs} from 'supersphincs';
import {IKeyPair} from '../ikey-pair';
import {ISign} from './isign';


/** @inheritDoc */
export class Sign implements ISign {
	/** @inheritDoc */
	public readonly bytes: Promise<number>				= superSphincs.bytes;

	/** @inheritDoc */
	public readonly privateKeyBytes: Promise<number>	= superSphincs.privateKeyBytes;

	/** @inheritDoc */
	public readonly publicKeyBytes: Promise<number>		= superSphincs.publicKeyBytes;

	/** @inheritDoc */
	public async importSuperSphincsPublicKeys (rsa: string, sphincs: string) : Promise<Uint8Array> {
		return (await superSphincs.importKeys({public: {rsa, sphincs}})).publicKey;
	}

	/** @inheritDoc */
	public async keyPair () : Promise<IKeyPair> {
		return superSphincs.keyPair();
	}

	/** @inheritDoc */
	public async open (
		signed: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<Uint8Array> {
		return superSphincs.open(signed, publicKey);
	}

	/** @inheritDoc */
	public async sign (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<Uint8Array> {
		return superSphincs.sign(message, privateKey);
	}

	/** @inheritDoc */
	public async signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<Uint8Array> {
		return superSphincs.signDetached(message, privateKey);
	}

	/** @inheritDoc */
	public async verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<boolean> {
		return superSphincs.verifyDetached(signature, message, publicKey);
	}

	constructor () {}
}
