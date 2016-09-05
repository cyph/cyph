import {Core} from 'core';
import {ILocalUser} from 'ilocaluser';
import {IRemoteUser} from 'iremoteuser';
import {Transport} from 'transport';
import {Potassium} from 'crypto/potassium';
import {Config} from 'cyph/config';
import {Util} from 'cyph/util';


/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export class PairwiseSession {
	private incomingMessageId: number						= 0;
	private incomingMessagesMax: number						= 0;
	private outgoingMessageId: number						= 0;
	private receiveLock: {}									= {};
	private incomingMessages: {[id: number] : Uint8Array[]}	= {};

	private core: Core;
	private isAborted: boolean;

	private newMessageId () : Uint8Array {
		return new Uint8Array(new Float64Array([
			this.outgoingMessageId++
		]).buffer);
	}

	public receive (cyphertext: string) : void {
		if (this.isAborted) {
			return;
		}

		try {
			const cyphertextBytes: Uint8Array	=
				Potassium.fromBase64(cyphertext)
			;

			if (this.transport.cyphertextIntercepters.length > 0) {
				let resolve: Function;
				while (resolve = this.transport.cyphertextIntercepters.shift()) {
					resolve(cyphertextBytes);
				}
				return;
			}

			const id: number	= new Float64Array(cyphertextBytes.buffer, 0, 1)[0];

			if (id >= this.incomingMessageId) {
				this.incomingMessagesMax	= Math.max(
					this.incomingMessagesMax,
					id
				);

				if (!this.incomingMessages[id]) {
					this.incomingMessages[id]	= [];
				}

				this.incomingMessages[id].push(cyphertextBytes);
			}
		}
		catch (_) {}

		if (!this.core) {
			return;
		}

		Util.lock(this.receiveLock, async () => {
			while (
				this.incomingMessageId <= this.incomingMessagesMax &&
				this.incomingMessages[this.incomingMessageId]
			) {
				let success: boolean;

				for (
					let cyphertextBytes of
					this.incomingMessages[this.incomingMessageId]
				) {
					if (
						!success &&
						(await this.core.receive(
							cyphertextBytes,
							this.remoteUser.getUsername()
						))
					) {
						success	= true;
					}

					Potassium.clearMemory(cyphertextBytes);
				}

				this.incomingMessages[this.incomingMessageId]	= null;

				if (!success) {
					break;
				}

				++this.incomingMessageId;
			}
		});
	}

	public async send (
		plaintext: string,
		timestamp: number = Util.timestamp()
	) : Promise<void> {
		if (this.isAborted || !this.core) {
			return;
		}

		const plaintextBytes: Uint8Array	= Potassium.fromString(plaintext);

		const id: Float64Array				= new Float64Array([
			Util.random(Config.maxSafeUint)
		]);

		const timestampBytes: Float64Array	= new Float64Array([
			timestamp
		]);

		const numBytes: Float64Array		= new Float64Array([
			plaintextBytes.length
		]);

		const numChunks: Float64Array		= new Float64Array([
			Math.ceil(plaintextBytes.length / Transport.chunkLength)
		]);

		const i = new Float64Array(1);
		for (; i[0] < plaintextBytes.length ; i[0] += Transport.chunkLength) {
			const chunk: Uint8Array	= new Uint8Array(
				plaintextBytes.buffer,
				i[0],
				Math.min(
					Transport.chunkLength,
					plaintextBytes.length - i[0]
				)
			);

			const data: Uint8Array	= Potassium.concatMemory(
				false,
				id,
				timestampBytes,
				numBytes,
				numChunks,
				i,
				chunk
			);

			try {
				await this.core.send(data, this.newMessageId());
			}
			finally {
				Potassium.clearMemory(data);
			}
		}

		Potassium.clearMemory(plaintextBytes);
		Potassium.clearMemory(id);
		Potassium.clearMemory(timestampBytes);
		Potassium.clearMemory(numBytes);
		Potassium.clearMemory(numChunks);
		Potassium.clearMemory(i);
	}

	/**
	 * @param potassium
	 * @param transport
	 * @param localUser
	 * @param remoteUser
	 * @param isAlice
	 */
	public constructor (
		potassium: Potassium,
		private transport: Transport,
		localUser: ILocalUser,
		private remoteUser: IRemoteUser,
		isAlice: boolean
	) { (async () => {
		try {
			let secret: Uint8Array;

			if (isAlice) {
				secret	= Potassium.randomBytes(
					potassium.EphemeralKeyExchange.secretBytes
				);

				const remotePublicKey	= await this.remoteUser.getPublicKey();

				this.transport.send(await potassium.Box.seal(
					secret,
					remotePublicKey
				));

				Potassium.clearMemory(remotePublicKey);
			}
			else {
				const keyPair	= await localUser.getKeyPair();

				secret	= await potassium.Box.open(
					await localUser.getInitialSecret(),
					keyPair
				);

				Potassium.clearMemory(keyPair.privateKey);
				Potassium.clearMemory(keyPair.publicKey);
			}

			this.core	= new Core(
				potassium,
				this.transport,
				isAlice,
				[await Core.newKeys(potassium, isAlice, secret)]
			);

			this.transport.connect();
		}
		catch (_) {
			this.isAborted	= true;
			this.transport.abort();

			/* Send invalid cyphertext to trigger
				friend's abortion logic */
			this.transport.send('');
		}
	})(); }
}
