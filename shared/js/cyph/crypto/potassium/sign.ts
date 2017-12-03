import * as lz4 from 'lz4';
import {superSphincs} from 'supersphincs';
import {IKeyPair} from '../../proto';
import {retryUntilSuccessful} from '../../util/wait';
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
		return retryUntilSuccessful(async () => {
			const keyPair	= await superSphincs.keyPair();

			const testInput	= potassiumUtil.randomBytes(32);
			if (!potassiumUtil.compareMemory(
				testInput,
				await this.open(
					await this.sign(testInput, keyPair.privateKey),
					keyPair.publicKey
				)
			)) {
				throw new Error('Corrupt Potassium.Sign key.');
			}

			return keyPair;
		});
	}

	/** @inheritDoc */
	public async open (
		signed: Uint8Array|string,
		publicKey: Uint8Array,
		additionalData: Uint8Array|string = new Uint8Array(0),
		decompress: boolean = false
	) : Promise<Uint8Array> {
		signed	= potassiumUtil.fromBase64(signed);

		const bytes		= await this.bytes;
		const signature	= potassiumUtil.toBytes(signed, 0, bytes);
		let message		= potassiumUtil.toBytes(signed, bytes);

		if (decompress) {
			message	= lz4.decode(message);
		}

		if (!(await this.verifyDetached(signature, message, publicKey, additionalData))) {
			throw new Error('Invalid signature.');
		}

		return message;
	}

	/** @inheritDoc */
	public async sign (
		message: Uint8Array|string,
		privateKey: Uint8Array,
		additionalData: Uint8Array|string = new Uint8Array(0),
		compress: boolean = false
	) : Promise<Uint8Array> {
		message	= potassiumUtil.fromString(message);

		const signature	= await superSphincs.signDetached(message, privateKey, additionalData);

		try {
			return potassiumUtil.concatMemory(
				false,
				signature,
				compress ? lz4.encode(message, {streamChecksum: false}) : message
			);
		}
		finally {
			potassiumUtil.clearMemory(signature);
		}
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
