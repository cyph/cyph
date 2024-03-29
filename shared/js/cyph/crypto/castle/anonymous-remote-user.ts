import memoize from 'lodash-es/memoize';
import {Observable} from 'rxjs';
import {IPublicKeyring} from '../../proto';
import {IPotassium} from '../potassium/ipotassium';
import {AnonymousLocalUser} from './anonymous-local-user';
import {IHandshakeState} from './ihandshake-state';
import {IRemoteUser} from './iremote-user';

/**
 * An anonymous user with an ephemeral key pair, authenticated via shared secret.
 */
export class AnonymousRemoteUser implements IRemoteUser {
	/** @inheritDoc */
	public readonly getPublicKeyring = memoize(
		async () : Promise<IPublicKeyring> => {
			const sharedSecretString = this.sharedSecret;

			if (
				sharedSecretString === undefined ||
				sharedSecretString.length < 1
			) {
				return {};
			}

			const [encryptedPublicBoxKey, sharedSecret] = await Promise.all([
				this.handshakeState.remotePublicKey.getValue(),
				(async () => {
					const {hash} = await this.potassium.passwordHash.hash(
						sharedSecretString,
						AnonymousLocalUser.handshakeSalt
					);

					this.sharedSecret = undefined;

					return hash;
				})()
			]);

			const publicKey = await this.potassium.secretBox.open(
				encryptedPublicBoxKey,
				sharedSecret
			);

			this.potassium.clearMemory(encryptedPublicBoxKey);
			this.potassium.clearMemory(sharedSecret);

			const potassiumPublicKey =
				await this.potassium.encoding.deserialize(
					await this.potassium.box.defaultMetadata,
					{publicKey}
				);

			return {
				boxPublicKeys: {
					[potassiumPublicKey.boxAlgorithm]:
						potassiumPublicKey.publicKey
				}
			};
		}
	);

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly handshakeState: IHandshakeState,

		/** @ignore */
		private sharedSecret: string | undefined,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
