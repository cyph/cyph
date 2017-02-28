import {ChangeDetectorRef} from '@angular/core';
import {analytics} from '../analytics';
import {config} from '../config';
import {IPotassium} from '../crypto/potassium/ipotassium';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {SecretBox} from '../crypto/potassium/secret-box';
import {EventManager, eventManager} from '../event-manager';
import {firebaseApp} from '../firebase-app';
import {events, rpcEvents} from '../session/enums';
import {ISession} from '../session/isession';
import {Message} from '../session/message';
import {Thread} from '../thread';
import {util} from '../util';
import {UIEvents} from './enums';
import {Transfer} from './transfer';


/**
 * Manages file transfers. Files are transmitted using Firebase Storage.
 * For encryption, native crypto is preferred when available for performance reasons,
 * but libsodium in a separate thread is used as a fallback.
 */
export class Files {
	/** @ignore */
	private static async cryptoThread (o: {
		cyphertext?: Uint8Array;
		key?: Uint8Array;
		plaintext?: Uint8Array;
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
				/* tslint:disable-next-line:variable-name */
				Potassium: any,
				eventManager: EventManager,
				locals: {
					callbackId: string;
					chunkSize: number;
					cyphertext?: Uint8Array;
					key?: Uint8Array;
					plaintext?: Uint8Array;
				},
				importScripts: Function
			) : Promise<void> {
				importScripts('/js/cyph/crypto/potassium/index.js');

				const potassium: IPotassium	= new Potassium();

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
	private nativeSecretBox: SecretBox;

	/** @ignore Temporary workaround. */
	public changeDetectorRef: ChangeDetectorRef;

	/** In-progress file transfers. */
	public readonly transfers: Set<Transfer>	= new Set<Transfer>();

	/** @ignore */
	private async decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		try {
			return this.nativeSecretBox ?
				await this.nativeSecretBox.open(cyphertext, key) :
				(await Files.cryptoThread({cyphertext, key}))[0]
			;
		}
		catch (_) {
			return potassiumUtil.fromString('File decryption failed.');
		}
	}

	/** @ignore */
	private async encryptFile (plaintext: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		key: Uint8Array;
	}> {
		try {
			if (this.nativeSecretBox) {
				const key: Uint8Array	= potassiumUtil.randomBytes(
					this.nativeSecretBox.keyBytes
				);

				return {
					cyphertext: await this.nativeSecretBox.seal(
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
	private receiveTransfer (transfer: Transfer) : void {
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
					potassiumUtil.clearMemory(transfer.key);
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
	private triggerUIEvent (
		event: UIEvents,
		...args: any[]
	) : void {
		this.session.trigger(events.filesUI, {event, args});
	}

	/**
	 * Sends data as a file with the specified name.
	 * @param plaintext
	 * @param name
	 * @param fileType
	 * @param image
	 * @param imageSelfDestructTimeout
	 */
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

		let uploadTask: firebase.storage.UploadTask;

		const o	= await this.encryptFile(plaintext);

		const transfer: Transfer	= new Transfer(
			name,
			fileType,
			image,
			imageSelfDestructTimeout,
			o.cyphertext.length,
			o.key
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

			if (!transfer.answer) {
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

		let complete	= false;
		while (!complete) {
			const path: string	= 'ephemeral/' + util.generateGuid();

			uploadTask	= (await firebaseApp).storage().ref(path).put(new Blob([o.cyphertext]));

			complete	= await new Promise<boolean>(resolve => uploadTask.on(
				'state_changed',
				(snapshot: firebase.storage.UploadTaskSnapshot) => {
					transfer.percentComplete	=
						snapshot.bytesTransferred /
						snapshot.totalBytes *
						100
					;
					this.triggerChangeDetection();
				},
				() => { resolve(transfer.answer === false); },
				() => {
					transfer.url	= uploadTask.snapshot.downloadURL || '';

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
		const isNativeCryptoSupported	= await potassiumUtil.isNativeCryptoSupported();

		if (isNativeCryptoSupported) {
			this.session.on(events.beginChat, () => {
				this.session.send(new Message(rpcEvents.files));
			});
		}

		const downloadAnswers	= new Map<string, boolean>();

		this.session.on(rpcEvents.files, async (transfer: Transfer) => {
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
								this.triggerUIEvent(UIEvents.rejected, transfer);
								transfer.answer	= false;
								this.session.send(new Message(rpcEvents.files, transfer));
							}
						}
					);
				}
			}
			/* Negotiation on whether or not to use SubtleCrypto */
			else if (isNativeCryptoSupported && !this.nativeSecretBox) {
				this.nativeSecretBox	= new SecretBox(true);
			}
		});
	})(); }
}
