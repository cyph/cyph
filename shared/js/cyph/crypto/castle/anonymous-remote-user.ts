import {IPotassium} from '../potassium/ipotassium';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	/** @ignore */
	private readonly encryptedPublicBoxKey: Promise<Uint8Array>;

	/** @ignore */
	private publicKey: Uint8Array;

	/** @ignore */
	private readonly sharedSecret: Promise<Uint8Array>;

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		if (this.publicKey) {
			return this.publicKey;
		}

		const encryptedPublicBoxKey	= await this.encryptedPublicBoxKey;
		const sharedSecret			= await this.sharedSecret;

		this.publicKey		= await this.potassium.secretBox.open(
			encryptedPublicBoxKey,
			sharedSecret
		);

		this.potassium.clearMemory(encryptedPublicBoxKey);
		this.potassium.clearMemory(sharedSecret);

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

		sharedSecret: string,

		/** @ignore */
		private readonly username: Promise<string>
	) {
		this.encryptedPublicBoxKey	= this.transport.interceptIncomingCyphertext();

		this.sharedSecret			= (async () =>
			(await this.potassium.passwordHash.hash(
				sharedSecret,
				new Uint8Array(await this.potassium.passwordHash.saltBytes)
			)).hash
		)();
	}
}
