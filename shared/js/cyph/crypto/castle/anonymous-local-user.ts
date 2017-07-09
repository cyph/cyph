import {IKeyPair} from '../../../proto';
import {IPotassium} from '../potassium/ipotassium';
import {ILocalUser} from './ilocal-user';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousLocalUser implements ILocalUser {
	/** @ignore */
	private keyPair: IKeyPair;

	/** @inheritDoc */
	public async getKeyPair () : Promise<IKeyPair> {
		if (this.keyPair) {
			return this.keyPair;
		}

		this.keyPair		= await this.potassium.box.keyPair();

		const sharedSecret	= (await this.potassium.passwordHash.hash(
			this.sharedSecret,
			new Uint8Array(await this.potassium.passwordHash.saltBytes)
		)).hash;

		this.transport.send(await this.potassium.secretBox.seal(
			this.keyPair.publicKey,
			sharedSecret
		));

		this.potassium.clearMemory(sharedSecret);

		this.sharedSecret	= '';

		return this.keyPair;
	}

	/** @inheritDoc */
	public async getRemoteSecret () : Promise<Uint8Array> {
		return this.transport.interceptIncomingCyphertext();
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly transport: Transport,

		/** @ignore */
		private sharedSecret: string
	) {}
}
