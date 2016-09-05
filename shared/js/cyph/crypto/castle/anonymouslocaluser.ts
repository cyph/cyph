import {ILocalUser} from 'ilocaluser';
import {Transport} from 'transport';
import {Potassium} from 'crypto/potassium';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousLocalUser implements ILocalUser {
	private keyPair: {publicKey: Uint8Array; privateKey: Uint8Array;};
	private cyphertextPromise: Promise<Uint8Array>;

	public getInitialSecret () : Promise<Uint8Array> {
		return this.cyphertextPromise;
	}

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

		this.potassium			= null;
		this.sharedSecret		= null;
		this.transport			= null;

		return this.keyPair;
	}

	/**
	 * @param potassium
	 * @param transport
	 * @param sharedSecret
	 */
	public constructor (
		private potassium: Potassium,
		private transport: Transport,
		private sharedSecret: string
	) {
		this.cyphertextPromise	= this.transport.interceptIncomingCyphertext();
	}
}
