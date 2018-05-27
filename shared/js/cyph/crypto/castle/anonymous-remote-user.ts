import {Observable} from 'rxjs';
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

	/** @inheritDoc */
	public async getPublicEncryptionKey () : Promise<Uint8Array> {
		if (!this.publicKey) {
			this.publicKey	= (async () => {
				const [encryptedPublicBoxKey, sharedSecret]	= await Promise.all([
					this.handshakeState.remotePublicKey.getValue(),
					(async () => {
						const {hash}	= await this.potassium.passwordHash.hash(
							this.sharedSecret,
							AnonymousLocalUser.handshakeSalt
						);

						this.sharedSecret	= '';

						return hash;
					})()
				]);

				const publicKey	= await this.potassium.secretBox.open(
					encryptedPublicBoxKey,
					sharedSecret
				);

				this.potassium.clearMemory(encryptedPublicBoxKey);
				this.potassium.clearMemory(sharedSecret);

				return publicKey;
			})();
		}

		return this.publicKey;
	}

	/** @inheritDoc */
	public async getPublicSigningKey () : Promise<undefined> {
		return undefined;
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly handshakeState: IHandshakeState,

		/** @ignore */
		private sharedSecret: string,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
