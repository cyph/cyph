import {strings} from '../../strings';
import {Potassium} from '../potassium';
import {IRemoteUser} from './iremoteuser';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	/** @ignore */
	private publicKey: Uint8Array;

	/** @ignore */
	private cyphertextPromise: Promise<Uint8Array>;

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		if (this.publicKey) {
			return this.publicKey;
		}

		const sharedSecret	= (await this.potassium.passwordHash.hash(
			this.sharedSecret,
			new Uint8Array(this.potassium.passwordHash.saltBytes)
		)).hash;

		this.publicKey		= await this.potassium.secretBox.open(
			await this.cyphertextPromise,
			sharedSecret
		);

		this.potassium.clearMemory(sharedSecret);

		this.cyphertextPromise	= undefined;
		this.sharedSecret		= undefined;

		return this.publicKey;
	}

	/** @inheritDoc */
	public getUsername () : string {
		return this.username;
	}

	constructor (
		/** @ignore */
		private readonly potassium: Potassium,

		/** @ignore */
		private readonly transport: Transport,

		/** @ignore */
		private sharedSecret: string,

		/** @ignore */
		private readonly username: string = strings.friend
	) {
		this.cyphertextPromise	= this.transport.interceptIncomingCyphertext();
	}
}
