import {ChangeDetectorRef} from '@angular/core';
import * as firebase from 'firebase';
import {analytics} from '../analytics';
import {config} from '../config';
import {Potassium, potassium} from '../crypto/potassium';
import {EventManager, eventManager} from '../eventmanager';
import {firebaseApp} from '../firebaseapp';
import {events, rpcEvents} from '../session/enums';
import {ISession} from '../session/isession';
import {Message} from '../session/message';
import {Thread} from '../thread';
import {util} from '../util';
import {UIEvents} from './enums';
import {IFiles} from './ifiles';
import {ITransfer} from './itransfer';
import {Transfer} from './transfer';


/**
 * Standard IFiles implementation built on Firebase.
 * For encryption, native crypto is preferred when available,
 * but libsodium in a separate thread is used as a fallback.
 */
export class Files implements IFiles {
	/** @ignore */
	private static async cryptoThread (o: {
		cyphertext?: Uint8Array,
		key?: Uint8Array,
		plaintext?: Uint8Array
	}) : Promise<Uint8Array[]> {
		const threadLocals	= {
			callbackId: 'files-' + util.generateGuid(),
			chunkSize: config.filesConfig.chunkSize,
			cyphertext: o.cyphertext,
			key: o.key,
			plaintext: o.plaintext
		};

		const thread	= new Thread(
			/* tslint:disable-next-line:only-arrow-functions */
			async function (
				potassium: Potassium,
				eventManager: EventManager,
				locals: {
					plaintext?: Uint8Array,
					cyphertext?: Uint8Array,
					key?: Uint8Array,
					chunkSize: number,
					callbackId: string
				},
				importScripts: Function
			) : Promise<void> {
				importScripts('/js/cyph/crypto/potassium/index.js');

				/* Encrypt */
				if (locals.plaintext) {
					const key: Uint8Array	= potassium.randomBytes(
						potassium.secretBox.keyBytes
					);

					const chunks: Uint8Array[]	= [];

					for (let i = 0 ; i < locals.plaintext.length ; i += locals.chunkSize) {
						try {
							chunks.push(await potassium.secretBox.seal(
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
							eventManager.trigger(
								locals.callbackId,
								[err.message, undefined, undefined]
							);

							return;
						}
					}

					const cyphertext: Uint8Array	= new Uint8Array(
						chunks.
							map(chunk => chunk.length + 4).
							reduce((a, b) => a + b, 0)
					);

					let j	= 0;
					for (const chunk of chunks) {
						cyphertext.set(
							new Uint8Array(new Uint32Array([chunk.length]).buffer),
							j
						);
						j += 4;

						cyphertext.set(chunk, j);
						j += chunk.length;

						potassium.clearMemory(chunk);
					}

					eventManager.trigger(
						locals.callbackId,
						[undefined, cyphertext, key]
					);
				}
				/* Decrypt */
				else if (locals.cyphertext && locals.key) {
					const chunks: Uint8Array[]	= [];

					for (let i = 0 ; i < locals.cyphertext.length ; ) {
						try {
							const chunkSize: number	= new DataView(
								locals.cyphertext.buffer,
								i
							).getUint32(0, true);

							i += 4;

							chunks.push(await potassium.secretBox.open(
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
							eventManager.trigger(
								locals.callbackId,
								[err.message, undefined]
							);

							return;
						}
					}

					const plaintext	= new Uint8Array(
						chunks.
							map(chunk => chunk.length).
							reduce((a, b) => a + b, 0)
					);

					let j	= 0;
					for (const chunk of chunks) {
						plaintext.set(chunk, j);
						j += chunk.length;

						potassium.clearMemory(chunk);
					}

					eventManager.trigger(
						locals.callbackId,
						[undefined, plaintext]
					);
				}
			},
			threadLocals
		);

		const data	= await eventManager.one<any[]>(threadLocals.callbackId);

		thread.stop();

		if (data[0]) {
			throw data[0];
		}
		else {
			return data.slice(1);
		}
	}


	/** @ignore */
	private nativePotassium: Potassium;

	/** @inheritDoc */
	public changeDetectorRef: ChangeDetectorRef;

	/** @inheritDoc */
	public readonly transfers: Set<ITransfer>	= new Set<ITransfer>();

	/** @ignore */
	private async decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		try {
			return this.nativePotassium ?
				await this.nativePotassium.secretBox.open(cyphertext, key) :
				(await Files.cryptoThread({cyphertext, key}))[0]
			;
		}
		catch (_) {
			return potassium.fromString('File decryption failed.');
		}
	}

	/** @ignore */
	private async encryptFile (plaintext: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		key: Uint8Array;
	}> {
		try {
			if (this.nativePotassium) {
				const key: Uint8Array	= potassium.randomBytes(
					this.nativePotassium.secretBox.keyBytes
				);

				return {
					cyphertext: await this.nativePotassium.secretBox.seal(
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

	/** @ignore */
	private receiveTransfer (transfer: ITransfer) : void {
		transfer.isOutgoing			= false;
		transfer.percentComplete	= 0;

		this.triggerUIEvent(
			UIEvents.confirm,
			transfer,
			true,
			async (ok: boolean) => {
				transfer.answer	= ok;

				this.session.send(new Message(
					rpcEvents.files,
					transfer
				));

				if (ok) {
					this.transfers.add(transfer);
					this.triggerChangeDetection();

					/* Arbitrarily assume ~500 Kb/s for progress bar estimation */
					(async () => {
						while (transfer.percentComplete < 85) {
							await util.sleep(1000);

							transfer.percentComplete +=
								util.random(100000, 25000) / transfer.size * 100
							;
							this.triggerChangeDetection();
						}
					})();

					const cyphertext: Uint8Array	= await util.requestBytes({
						retries: 5,
						/* Temporary workaround while Firebase adds CORS support */
						url: (transfer.url || '').replace(
							'firebasestorage.googleapis.com',
							'api.cyph.com'
						)
					});

					(await firebaseApp).storage().refFromURL(transfer.url).delete();

					const plaintext: Uint8Array	= await this.decryptFile(cyphertext, transfer.key);

					transfer.percentComplete	= 100;
					this.triggerChangeDetection();
					potassium.clearMemory(transfer.key);
					this.triggerUIEvent(UIEvents.save, transfer, plaintext);
					await util.sleep(1000);
					this.transfers.delete(transfer);
					this.triggerChangeDetection();
				}
				else {
					this.triggerUIEvent(UIEvents.rejected, transfer);
					(await firebaseApp).storage().refFromURL(transfer.url).delete();
				}
			}
		);
	}

	/** @ignore */
	private triggerChangeDetection () : void {
		if (this.changeDetectorRef) {
			this.changeDetectorRef.detectChanges();
		}
	}

	/** @ignore */
	private triggerUIEvent(
		event: UIEvents,
		...args: any[]
	) : void {
		this.session.trigger(events.filesUI, {event, args});
	}

	/** @inheritDoc */
	public async send (
		plaintext: Uint8Array,
		name: string,
		fileType: string,
		image: boolean,
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		if (plaintext.length > config.filesConfig.maxSize) {
			this.triggerUIEvent(UIEvents.tooLarge);

			analytics.sendEvent({
				eventAction: 'toolarge',
				eventCategory: 'file',
				eventValue: 1,
				hitType: 'event'
			});

			return;
		}

		let uploadTask: firebase.UploadTask;

		const transfer: ITransfer	= new Transfer(
			name,
			fileType,
			image,
			imageSelfDestructTimeout,
			plaintext.length
		);

		this.transfers.add(transfer);
		this.triggerChangeDetection();

		analytics.sendEvent({
			eventAction: 'send',
			eventCategory: 'file',
			eventValue: 1,
			hitType: 'event'
		});

		this.triggerUIEvent(
			UIEvents.started,
			transfer
		);

		eventManager.one<boolean>('transfer-' + transfer.id).then(answer => {
			transfer.answer	= answer;

			this.triggerUIEvent(
				UIEvents.completed,
				transfer,
				transfer.image ? plaintext : undefined
			);

			if (transfer.answer === false) {
				this.transfers.delete(transfer);
				this.triggerChangeDetection();

				if (uploadTask) {
					uploadTask.cancel();
				}
			}
		});

		this.session.send(new Message(
			rpcEvents.files,
			transfer
		));

		const o	= await this.encryptFile(plaintext);

		transfer.size	= o.cyphertext.length;
		transfer.key	= o.key;

		let complete	= false;
		while (!complete) {
			const path: string	= 'ephemeral/' + util.generateGuid();

			uploadTask	= (await firebaseApp).storage().ref(path).put(new Blob([o.cyphertext]));

			complete	= await new Promise<boolean>(resolve => uploadTask.on(
				'state_changed',
				(snapshot: firebase.UploadTaskSnapshot) => {
					transfer.percentComplete	=
						snapshot.bytesTransferred /
						snapshot.totalBytes *
						100
					;
					this.triggerChangeDetection();
				},
				() => { resolve(transfer.answer === false); },
				() => {
					transfer.url	= uploadTask.snapshot.downloadURL;

					this.session.send(new Message(
						rpcEvents.files,
						transfer
					));

					this.transfers.delete(transfer);
					this.triggerChangeDetection();
					resolve(true);
				}
			));
		}
	}

	constructor (
		/** @ignore */
		private readonly session: ISession
	) { (async () => {
		const isNativeCryptoSupported	=
			await Potassium.isNativeCryptoSupported()
		;

		if (isNativeCryptoSupported) {
			this.session.on(events.beginChat, () => {
				this.session.send(new Message(rpcEvents.files));
			});
		}

		const downloadAnswers	= new Map<string, boolean>();

		this.session.on(rpcEvents.files, async (transfer: ITransfer) => {
			if (transfer.id) {
				/* Outgoing file transfer acceptance or rejection */
				if (transfer.answer === true || transfer.answer === false) {
					eventManager.trigger('transfer-' + transfer.id, transfer.answer);
				}
				/* Incoming file transfer */
				else if (transfer.url) {
					while (!downloadAnswers.has(transfer.id)) {
						await util.sleep();
					}
					if (downloadAnswers.get(transfer.id)) {
						downloadAnswers.delete(transfer.id);
						this.receiveTransfer(transfer);
					}
				}
				/* Incoming file transfer request */
				else {
					this.triggerUIEvent(UIEvents.started, transfer);

					this.triggerUIEvent(
						UIEvents.confirm,
						transfer,
						false,
						(ok: boolean) => {
							downloadAnswers.set(transfer.id, ok);

							if (!ok) {
								this.triggerUIEvent(
									UIEvents.rejected,
									transfer
								);

								transfer.answer	= false;

								this.session.send(new Message(
									rpcEvents.files,
									transfer
								));
							}
						}
					);
				}
			}
			/* Negotiation on whether or not to use SubtleCrypto */
			else if (isNativeCryptoSupported && !this.nativePotassium) {
				this.nativePotassium	= new Potassium(true);
			}
		});
	})(); }
}
