import {ILocalUser} from 'ilocaluser';
import {Transport} from 'transport';
import {Potassium} from 'crypto/potassium';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousLocalUser implements ILocalUser {
	private keyPair: {publicKey: Uint8Array; privateKey: Uint8Array;};

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

	public getRemoteSecret () : Promise<Uint8Array> {
		return this.transport.interceptIncomingCyphertext();
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
	) {}
}
