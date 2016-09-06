import {IRemoteUser} from 'iremoteuser';
import {Transport} from 'transport';
import {Potassium} from 'crypto/potassium';
import {Strings} from 'cyph/strings';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	private publicKey: Uint8Array;
	private cyphertextPromise: Promise<Uint8Array>;

	public async getPublicKey () : Promise<Uint8Array> {
		if (this.publicKey) {
			return this.publicKey;
		}

		const sharedSecret	= (await this.potassium.PasswordHash.hash(
			this.sharedSecret,
			new Uint8Array(this.potassium.PasswordHash.saltBytes)
		)).hash;

		this.publicKey		= await this.potassium.SecretBox.open(
			await this.cyphertextPromise,
			sharedSecret
		);

		Potassium.clearMemory(sharedSecret);

		this.cyphertextPromise	= null;
		this.sharedSecret		= null;

		return this.publicKey;
	}

	public getUsername () : string {
		return this.username;
	}

	/**
	 * @param potassium
	 * @param transport
	 * @param sharedSecret
	 * @param username
	 */
	public constructor (
		private potassium: Potassium,
		private transport: Transport,
		private sharedSecret: string,
		private username: string = Strings.friend
	) {
		this.cyphertextPromise	= this.transport.interceptIncomingCyphertext();
	}
}
