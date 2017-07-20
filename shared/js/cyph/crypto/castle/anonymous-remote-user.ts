import {IPotassium} from '../potassium/ipotassium';
import {AnonymousLocalUser} from './anonymous-local-user';
import {IHandshakeState} from './ihandshake-state';
import {IRemoteUser} from './iremote-user';


/**
 * An anonymous user with an ephemeral key pair, authenticated via shared secret.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	/** @ignore */
	private publicKey?: Promise<Uint8Array>;

	/** @ignore */
	private readonly sharedSecret: Promise<Uint8Array>;

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		if (this.publicKey) {
			return this.publicKey;
		}

		this.publicKey	= (async () => {
			const encryptedPublicBoxKey	= await this.handshakeState.remotePublicKey.getValue();
			const sharedSecret			= await this.sharedSecret;

			const publicKey	= await this.potassium.secretBox.open(
				encryptedPublicBoxKey,
				sharedSecret
			);

			this.potassium.clearMemory(encryptedPublicBoxKey);
			this.potassium.clearMemory(sharedSecret);

			return publicKey;
		})();

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
		private readonly handshakeState: IHandshakeState,

		sharedSecret: string,

		/** @ignore */
		private readonly username: Promise<string>
	) {
		this.sharedSecret			= (async () =>
			(await this.potassium.passwordHash.hash(
				sharedSecret,
				AnonymousLocalUser.handshakeSalt
			)).hash
		)();
	}
}
