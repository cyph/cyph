import * as lz4 from 'lz4';
import {superSphincs} from 'supersphincs';
import {IKeyPair} from '../../../proto';
import {ISign} from './isign';
import {potassiumUtil} from './potassium-util';


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
		publicKey: Uint8Array,
		additionalData?: Uint8Array|string,
		decompress: boolean = false
	) : Promise<Uint8Array> {
		return superSphincs.open(
			decompress ? lz4.decode(potassiumUtil.fromBase64(signed)) : signed,
			publicKey,
			additionalData
		);
	}

	/** @inheritDoc */
	public async sign (
		message: Uint8Array|string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array|string,
		compress: boolean = false
	) : Promise<Uint8Array> {
		const signed	= await superSphincs.sign(message, privateKey, additionalData);
		return compress ? lz4.encode(signed) : signed;
	}

	/** @inheritDoc */
	public async signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array> {
		return superSphincs.signDetached(message, privateKey, additionalData);
	}

	/** @inheritDoc */
	public async verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<boolean> {
		return superSphincs.verifyDetached(signature, message, publicKey, additionalData);
	}

	constructor () {}
}
