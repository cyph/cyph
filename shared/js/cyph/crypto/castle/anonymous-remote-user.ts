import {IPotassium} from '../potassium/ipotassium';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	/** @ignore */
	private cyphertextPromise: Promise<Uint8Array>;

	/** @ignore */
	private publicKey: Uint8Array;

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		if (this.publicKey) {
			return this.publicKey;
		}

		const sharedSecret	= (await this.potassium.passwordHash.hash(
			this.sharedSecret,
			new Uint8Array(await this.potassium.passwordHash.saltBytes)
		)).hash;

		this.publicKey		= await this.potassium.secretBox.open(
			await this.cyphertextPromise,
			sharedSecret
		);

		this.potassium.clearMemory(sharedSecret);

		this.cyphertextPromise	= Promise.resolve(new Uint8Array(0));
		this.sharedSecret		= '';

		return this.publicKey;
	}

	/** @inheritDoc */
	public async getUsername () : Promise<string> {
		return this.username;
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly transport: Transport,

		/** @ignore */
		private sharedSecret: string,

		/** @ignore */
		private readonly username: Promise<string>
	) {
		this.cyphertextPromise	= this.transport.interceptIncomingCyphertext();
	}
}
