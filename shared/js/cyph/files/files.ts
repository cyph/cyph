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
		}
	) : Promise<any[]> {
		return new Promise((resolve, reject) => {
			locals.chunkSize	= Config.filesConfig.chunkSize;
			locals.callbackId	= 'files-' + Util.generateGuid();

			const thread	= new Thread((Cyph: any, locals: any, importScripts: Function) => {
				importScripts('/js/cyph/crypto/crypto.js');

				System.import('cyph/crypto/crypto').then(async (Crypto) => {
					const potassium	= new Crypto.Potassium();

					/* Encrypt */
					if (locals.plaintext) {
						const key: Uint8Array	= Crypto.Potassium.randomBytes(
							potassium.SecretBox.keyBytes
						);

						const chunks: Uint8Array[]	= [];

						for (let i = 0 ; i < locals.plaintext.length ; i += locals.chunkSize) {
							try {
								chunks.push(await potassium.SecretBox.seal(
									new Uint8Array(
										locals.plaintext.buffer,
										i,
										(locals.plaintext.length - i) > locals.chunkSize ?
											locals.chunkSize :
											undefined
									),
									key
								));
							}
							catch (err) {
								Cyph.EventManager.trigger(
									locals.callbackId,
									[err, null, null]
								);

								return;
							}
						}

						const cyphertext: Uint8Array	= new Uint8Array(
							chunks.
								map(chunk => chunk.length + 4).
								reduce((a, b) => a + b, 0)
						);

						let j: number	= 0;
						for (let chunk of chunks) {
							cyphertext.set(
								new Uint8Array(new Uint32Array([chunk.length]).buffer),
								j
							);
							j += 4;

							cyphertext.set(chunk, j);
							j += chunk.length;

							Crypto.Potassium.clearMemory(chunk);
						}

						Cyph.EventManager.trigger(
							locals.callbackId,
							[null, cyphertext, key]
						);
					}
					/* Decrypt */
					else if (locals.cyphertext && locals.key) {
						const chunks: Uint8Array[]	= [];

						for (let i = 0 ; i < locals.cyphertext.length ;) {
							try {
								const chunkSize: number	= new DataView(
									locals.cyphertext.buffer,
									i
								).getUint32(0, true);

								i += 4;

								chunks.push(await potassium.SecretBox.open(
									new Uint8Array(
										locals.cyphertext.buffer,
										i,
										chunkSize
									),
									locals.key
								));

								i += chunkSize;
							}
							catch (err) {
								Cyph.EventManager.trigger(
									locals.callbackId,
									[err, null]
								);

								return;
							}
						}

						const plaintext	= new Uint8Array(
							chunks.
								map(chunk => chunk.length).
								reduce((a, b) => a + b, 0)
						);

						let j: number	= 0;
						for (let chunk of chunks) {
							plaintext.set(chunk, j);
							j += chunk.length;

							Crypto.Potassium.clearMemory(chunk);
						}

						Cyph.EventManager.trigger(
							locals.callbackId,
							[null, plaintext]
						);
					}
				});
			}, locals);

			EventManager.one(locals.callbackId, data => {
				thread.stop();

				const err	= data[0];
				if (err) {
					reject(err);
				}
				else {
					resolve(data.slice(1));
				}
			});
		});
	}


	private nativePotassium: Potassium;

	public transfers: ITransfer[]	= [];

	private async decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		try {
			return this.nativePotassium ?
				await this.nativePotassium.SecretBox.open(cyphertext, key) :
				(await Files.cryptoThread({cyphertext, key}))[0]
			;
		}
		catch (_) {
			return Potassium.fromString('File decryption failed.');
		}
	}

	private async encryptFile (plaintext: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		key: Uint8Array;
	}> {
		try {
			if (this.nativePotassium) {
				const key: Uint8Array	= Potassium.randomBytes(
					this.nativePotassium.SecretBox.keyBytes
				);

				return {
					cyphertext: await this.nativePotassium.SecretBox.seal(
						plaintext,
						key
					),
					key
				};
			}
			else {
				const results	= await Files.cryptoThread({plaintext});

				return {
					cyphertext: results[0],
					key: results[1]
				};
			}
		}
		catch (_) {
			return {
				cyphertext: new Uint8Array(0),
				key: new Uint8Array(0)
			};
		}
	}

	private receiveTransfer (transfer: ITransfer) : void {
		transfer.isOutgoing			= false;
		transfer.percentComplete	= 0;

		this.triggerUIEvent(
			UIEvents.confirm,
			transfer.name,
			transfer.size,
			true,
			async (ok: boolean) => {
				transfer.answer	= ok;

				this.session.send(new Session.Message(
					Session.RPCEvents.files,
					transfer
				));

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

					const cyphertext: Uint8Array	= new Uint8Array(await Util.request({
						/* Temporary workaround while Firebase adds CORS support */
						url: (transfer.url || '').replace(
							'firebasestorage.googleapis.com',
							'api.cyph.com'
						),
						responseType: 'arraybuffer',
						retries: 5
					}));

					transfer.percentComplete	= Math.max(
						transfer.percentComplete,
						85
					);

					Firebase.call({ storage: {
						refFromURL: { args: [transfer.url],
						delete: {}}
					}});

					const plaintext: Uint8Array	= await this.decryptFile(
						cyphertext,
						transfer.key
					);

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
				else {
					this.triggerUIEvent(
						UIEvents.rejected,
						transfer.name
					);

					Firebase.call({ storage: {
						refFromURL: { args: [transfer.url],
						delete: {}}
					}});
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

	public async send (plaintext: Uint8Array, name: string) : Promise<void> {
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

		let uploadTaskId: string;

		const transfer: ITransfer	= new Transfer(
			name,
			plaintext.length
		);

		const transferIndex: number	= this.transfers.push(transfer) - 1;

		Analytics.send({
			hitType: 'event',
			eventCategory: 'file',
			eventAction: 'send',
			eventValue: 1
		});

		this.triggerUIEvent(
			UIEvents.started,
			Session.Users.me,
			transfer.name
		);

		EventManager.one('transfer-' + transfer.id, (answer: boolean) => {
			transfer.answer	= answer;

			this.triggerUIEvent(
				UIEvents.completed,
				transfer.name,
				transfer.answer
			);

			if (transfer.answer === false) {
				this.transfers.splice(transferIndex, 1);
				this.controller.update();

				if (uploadTaskId) {
					Firebase.call({ returnValue: {
						id: uploadTaskId,
						command: {
							cancel: {}
						}
					}});
				}
			}
		});

		this.session.send(new Session.Message(
			Session.RPCEvents.files,
			transfer
		));

		const o	= await this.encryptFile(plaintext);

		transfer.size	= o.cyphertext.length;
		transfer.key	= o.key;

		this.controller.update();

		Util.retryUntilComplete(async (retry) => {
			const path: string	= 'ephemeral/' +  Util.generateGuid();

			uploadTaskId	= await Firebase.call({ storage: {
				ref: { args: [path],
				put: { args: [new Blob([o.cyphertext])]}}
			}});

			Firebase.call({ returnValue: {
				id: uploadTaskId,
				command: { on: { args: [
					'state_changed',
					snapshot => {
						transfer.percentComplete	=
							snapshot.bytesTransferred /
							snapshot.totalBytes *
							100
						;

						this.controller.update();
					},
					err => {
						if (transfer.answer !== false) {
							retry();
						}
					},
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
				]}}
			}});
		});
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

		const downloadAnswers: {[id: string] : boolean}	= {};

		this.session.on(Session.RPCEvents.files, (transfer?: ITransfer) => {
			if (transfer) {
				/* Outgoing file transfer acceptance or rejection */
				if (transfer.answer === true || transfer.answer === false) {
					EventManager.trigger('transfer-' + transfer.id, transfer.answer);
				}
				/* Incoming file transfer */
				else if (transfer.url) {
					Util.retryUntilComplete(retry => {
						if (downloadAnswers[transfer.id] === true) {
							downloadAnswers[transfer.id]	= null;
							this.receiveTransfer(transfer);
						}
						else if (downloadAnswers[transfer.id] !== false) {
							retry();
						}
					});
				}
				/* Incoming file transfer request */
				else {
					this.triggerUIEvent(
						UIEvents.started,
						Session.Users.friend,
						transfer.name
					);

					this.triggerUIEvent(
						UIEvents.confirm,
						transfer.name,
						transfer.size,
						false,
						(ok: boolean) => {
							downloadAnswers[transfer.id]	= ok;

							if (!ok) {
								this.triggerUIEvent(
									UIEvents.rejected,
									transfer.name
								);

								transfer.answer	= false;

								this.session.send(new Session.Message(
									Session.RPCEvents.files,
									transfer
								));
							}
						}
					);
				}
			}
			/* Negotiation on whether or not to use SubtleCrypto */
			else if (Files.subtleCryptoIsSupported && !this.nativePotassium) {
				this.nativePotassium	= new Potassium(true);
			}
		});
	}
}
