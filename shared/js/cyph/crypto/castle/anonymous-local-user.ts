import {IKeyPair} from '../../../proto';
import {IPotassium} from '../potassium/ipotassium';
import {potassiumUtil} from '../potassium/potassium-util';
import {ILocalUser} from './ilocal-user';
import {Transport} from './transport';


/**
 * An anonymous user with an ephemeral key pair, authenticated via
 * shared secret rather than AGSE signature.
 */
export class AnonymousLocalUser implements ILocalUser {
	/** Salt used for shared secret handshake. */
	public static handshakeSalt: Uint8Array	= potassiumUtil.fromBase64(
		'QmaEvu1jYA3SKXsVtoR+9/92/tvMIXOe0NRfwQR5bPw='
	);


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
			AnonymousLocalUser.handshakeSalt
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
