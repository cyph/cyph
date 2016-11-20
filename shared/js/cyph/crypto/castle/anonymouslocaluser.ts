import {Potassium} from '../potassium';
import {ILocalUser} from './ilocaluser';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousLocalUser implements ILocalUser {
	/** @ignore */
	private keyPair: {publicKey: Uint8Array; privateKey: Uint8Array};

	/** @inheritDoc */
	public async getKeyPair () : Promise<{
		publicKey: Uint8Array;
		privateKey: Uint8Array;
	}> {
		if (this.keyPair) {
			return this.keyPair;
		}

		this.keyPair		= await this.potassium.Box.keyPair();

		const sharedSecret	= (await this.potassium.PasswordHash.hash(
			this.sharedSecret,
			new Uint8Array(this.potassium.PasswordHash.saltBytes)
		)).hash;

		this.transport.send(await this.potassium.SecretBox.seal(
			this.keyPair.publicKey,
			sharedSecret
		));

		Potassium.clearMemory(sharedSecret);

		this.sharedSecret		= null;

		return this.keyPair;
	}

	/** @inheritDoc */
	public getRemoteSecret () : Promise<Uint8Array> {
		return this.transport.interceptIncomingCyphertext();
	}

	constructor (
		/** @ignore */
		private potassium: Potassium,

		/** @ignore */
		private transport: Transport,

		/** @ignore */
		private sharedSecret: string
	) {}
}
