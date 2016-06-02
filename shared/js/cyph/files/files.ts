import {UIEvents} from 'enums';
import {IFiles} from 'ifiles';
import {ITransfer} from 'itransfer';
import {Transfer} from 'transfer';
import {Analytics} from 'cyph/analytics';
import {Config} from 'cyph/config';
import {EventManager} from 'cyph/eventmanager';
import {Firebase} from 'cyph/firebase';
import {IController} from 'cyph/icontroller';
import {Thread} from 'cyph/thread';
import {Util} from 'cyph/util';
import {Potassium} from 'crypto/crypto';
import * as Session from 'session/session';


export {
	IFiles,
	UIEvents
};


export class Files implements IFiles {
	private static subtleCryptoIsSupported: boolean	=
		!!(crypto && crypto.subtle && crypto.subtle.encrypt) &&
		locationData.protocol === 'https:'
	;

	private static cryptoThread (
		locals: {
			plaintext?: Uint8Array,
			cyphertext?: Uint8Array,
			key?: Uint8Array,
			chunkSize?: number,
			callbackId?: string
		},
		callback: Function
	) {
		locals.chunkSize	= Config.filesConfig.chunkSize;
		locals.callbackId	= 'files-' + Util.generateGuid();

		const thread	= new Thread((Cyph: any, locals: any, importScripts: Function) => {
			importScripts('/lib/js/crypto/libsodium/dist/browsers-sumo/combined/sodium.min.js');
			importScripts('/js/cyph/crypto/crypto.js');

			System.import('cyph/crypto/crypto').then(Crypto => {
				const potassium	= new Crypto.Potassium();

				/* Encrypt */
				if (locals.plaintext) {
					const key: Uint8Array	= Crypto.Potassium.randomBytes(
						potassium.SecretBox.keyBytes
					);

					const chunks: Uint8Array[]	= [];

					let i: number	= 0;
					Cyph.Util.retryUntilComplete(retry => {
						if (i < locals.plaintext.length) {
							potassium.SecretBox.seal(
								new Uint8Array(
									locals.plaintext.buffer,
									i,
									(locals.plaintext.length - i) > locals.chunkSize ?
										locals.chunkSize :
										undefined
								),
								key,
								(chunk: Uint8Array, err: any) => {
									if (err) {
										Cyph.EventManager.trigger(
											locals.callbackId,
											[null, null, err]
										);
									}
									else {
										i += locals.chunkSize;
										chunks.push(chunk);
										retry(-1);
									}
								}
							);
						}
						else {
							const cyphertext	= new Uint8Array(
								chunks.
									map(chunk => chunk.length + 4).
									reduce((a, b) => a + b, 0)
							);

							let j: number	= 0;
							for (const chunk of chunks) {
								cyphertext.set(
									new Uint8Array(new Uint32Array([chunk.length]).buffer),
									j
								);
								j += 4;

								cyphertext.set(chunk, j);
								j += chunk.length;
							}

							Cyph.EventManager.trigger(
								locals.callbackId,
								[cyphertext, key]
							);
						}
					});
				}
				/* Decrypt */
				else if (locals.cyphertext && locals.key) {
					const chunks: Uint8Array[]	= [];

					let i: number	= 0;
					Cyph.Util.retryUntilComplete(retry => {
						if (i < locals.cyphertext.length) {
							const chunkSize: number	= new DataView(
								locals.cyphertext.buffer,
								i
							).getUint32(0, true);

							i += 4;

							potassium.SecretBox.open(
								new Uint8Array(
									locals.cyphertext.buffer,
									i,
									chunkSize
								),
								locals.key,
								(chunk: Uint8Array, err: any) => {
									if (err) {
										Cyph.EventManager.trigger(
											locals.callbackId,
											[null, err]
										);
									}
									else {
										i += chunkSize;
										chunks.push(chunk);
										retry(-1);
									}
								}
							);
						}
						else {
							const plaintext	= new Uint8Array(
								chunks.
									map(chunk => chunk.length).
									reduce((a, b) => a + b, 0)
							);

							let j: number	= 0;
							for (const chunk of chunks) {
								plaintext.set(chunk, j);
								j += chunk.length;
							}

							Cyph.EventManager.trigger(
								locals.callbackId,
								[plaintext]
							);
						}
					});
				}
			});
		}, locals);

		EventManager.one(locals.callbackId, data => {
			thread.stop();
			callback.apply(this, data);
		});
	}


	private nativePotassium: Potassium;

	public transfers: ITransfer[]	= [];

	private decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array,
		callback: (plaintext: Uint8Array) => void
	) : void {
		const f	= (plaintext: Uint8Array, err: any) => {
			callback(err ?
				Potassium.fromString('File decryption failed.') :
				plaintext
			);
		};

		if (this.nativePotassium) {
			this.nativePotassium.SecretBox.open(cyphertext, key, f);
		}
		else {
			Files.cryptoThread({cyphertext, key}, f);
		}
	}

	private encryptFile (
		plaintext: Uint8Array,
		callback: (cyphertext: Uint8Array, key: Uint8Array) => void
	) : void {
		const f	= (cyphertext: Uint8Array, key: Uint8Array, err: any) => {
			callback(
				err ?
					new Uint8Array(0) :
					cyphertext
				,
				key
			);
		};

		if (this.nativePotassium) {
			const key: Uint8Array	= Potassium.randomBytes(
				this.nativePotassium.SecretBox.keyBytes
			);

			this.nativePotassium.SecretBox.seal(
				plaintext,
				key,
				(cyphertext: Uint8Array, err: any) => f(cyphertext, key, err)
			);
		}
		else {
			Files.cryptoThread({plaintext}, f);
		}
	}

	private receiveTransfer (transfer: ITransfer) : void {
		transfer.isOutgoing			= false;
		transfer.percentComplete	= 0;

		this.triggerUIEvent(
			UIEvents.confirm,
			transfer.name,
			(ok: boolean, title: string) => {
				if (ok) {
					const transferIndex: number	= this.transfers.push(transfer) - 1;

					/* Arbitrarily assume ~500 Kb/s for progress bar estimation */
					const intervalId: number	= setInterval(() => {
						if (transfer.percentComplete >= 100) {
							clearInterval(intervalId);
						}
						else {
							transfer.percentComplete +=
								Util.random(100000, 25000) / transfer.size * 100
							;
						}

						this.controller.update();
					}, 1000);

					Util.retryUntilComplete(retry => Util.request({
						/* Temporary workaround while Firebase adds CORS support */
						url: (transfer.url || '').replace(
							'firebasestorage.googleapis.com',
							'firebase.cyph.com'
						),
						responseType: 'arraybuffer',
						error: retry,
						success: (cyphertext: ArrayBuffer) => {
							transfer.percentComplete	= Math.max(
								transfer.percentComplete,
								85
							);

							Firebase.call({ storage: {
								refFromURL: { args: [transfer.url],
								delete: {}}
							}});

							this.decryptFile(
								new Uint8Array(cyphertext),
								transfer.key,
								(plaintext: Uint8Array) => {
									transfer.percentComplete	= 100;

									Potassium.clearMemory(transfer.key);

									Util.openUrl(
										URL.createObjectURL(new Blob([plaintext])),
										transfer.name
									);

									setTimeout(() => {
										this.transfers.splice(transferIndex, 1);
										this.controller.update();
									}, 1000);
								}
							);
						}
					}));
				}
				else {
					this.triggerUIEvent(
						UIEvents.rejected,
						title
					);
				}
			}
		);
	}

	private triggerUIEvent(
		event: UIEvents,
		...args: any[]
	) : void {
		this.session.trigger(Session.Events.filesUI, {event, args});
	}

	public send (plaintext: Uint8Array, name: string) : void {
		if (plaintext.length > Config.filesConfig.maxSize) {
			this.triggerUIEvent(UIEvents.tooLarge);

			Analytics.send({
				hitType: 'event',
				eventCategory: 'file',
				eventAction: 'toolarge',
				eventValue: 1
			});

			return;
		}

		Analytics.send({
			hitType: 'event',
			eventCategory: 'file',
			eventAction: 'send',
			eventValue: 1
		});

		this.triggerUIEvent(
			UIEvents.transferStarted,
			Session.Users.me,
			name
		);

		this.session.send(new Session.Message(
			Session.RPCEvents.files,
			name
		));

		this.encryptFile(
			plaintext,
			(cyphertext: Uint8Array, key: Uint8Array) => {
				const transfer: ITransfer	= new Transfer(
					name,
					cyphertext.length,
					key
				);

				const transferIndex: number	= this.transfers.push(transfer) - 1;

				this.controller.update();

				Util.retryUntilComplete(retry => {
					const path: string	= 'ephemeral/' +  Util.generateGuid();

					Firebase.call({ storage: {
						ref: { args: [path],
						put: { args: [new Blob([cyphertext])],
						on: { args: [
							'state_changed',
							snapshot => {
								transfer.percentComplete	=
									snapshot.bytesTransferred /
									snapshot.totalBytes *
									100
								;

								this.controller.update();
							},
							err => retry(),
							() => {
								Firebase.call({ storage: {
									ref: { args: [path],
									getDownloadURL: {
										then: { args: [(url: string) => {
											transfer.url	= url;
											this.session.send(new Session.Message(
												Session.RPCEvents.files,
												transfer
											));

											this.transfers.splice(transferIndex, 1);
											this.controller.update();
										}]}
									}}
								}});
							}
						]}}}
					}});
				});
			}
		);
	}

	/**
	 * @param session
	 * @param controller
	 */
	public constructor (
		private session: Session.ISession,
		private controller: IController
	) {
		if (Files.subtleCryptoIsSupported) {
			this.session.on(Session.Events.beginChat, () => this.session.send(
				new Session.Message(Session.RPCEvents.files)
			));
		}

		this.session.on(Session.RPCEvents.files, (data?: string|ITransfer) => {
			if (typeof data === 'string') {
				this.triggerUIEvent(
					UIEvents.transferStarted,
					Session.Users.friend,
					data
				);
			}
			else if (data) {
				this.receiveTransfer(data);
			}
			else if (Files.subtleCryptoIsSupported && !this.nativePotassium) {
				this.nativePotassium	= new Potassium(true);
			}
		});
	}
}
