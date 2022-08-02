import memoize from 'lodash-es/memoize';
import {IKeyPair, IPrivateKeyring} from '../../proto/types';
import {IPotassium} from '../potassium/ipotassium';
import {potassiumUtil} from '../potassium/potassium-util';
import {IHandshakeState} from './ihandshake-state';
import {ILocalUser} from './ilocal-user';

/**
 * An anonymous user with an ephemeral key pair, authenticated via shared secret.
 */
export class AnonymousLocalUser implements ILocalUser {
	/** Salt used for shared secret handshake. */
	public static handshakeSalt: Uint8Array = potassiumUtil.fromBase64(
		'NFsmRElh9RGWChCPUKvL9Q=='
	);

	/** @inheritDoc */
	public readonly getPrivateKeyring = memoize(
		async () : Promise<
			IPrivateKeyring & {boxPrivateKeys: Record<string, IKeyPair>}
		> => {
			const keyPair = await this.potassium.box.keyPair();

			if (this.sharedSecret !== undefined) {
				const sharedSecret = (
					await this.potassium.passwordHash.hash(
						this.sharedSecret,
						AnonymousLocalUser.handshakeSalt
					)
				).hash;

				await this.handshakeState.localPublicKey.setValue(
					await this.potassium.secretBox.seal(
						keyPair.publicKey,
						sharedSecret
					)
				);

				this.potassium.clearMemory(sharedSecret);

				this.sharedSecret = undefined;
			}

			/* Note that a signing key pair is not provided */
			return {
				boxPrivateKeys: {
					[await this.potassium.box.currentAlgorithm]: keyPair
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
		private sharedSecret?: string
	) {}
}
