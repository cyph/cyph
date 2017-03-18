import {ChangeDetectorRef, Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {config} from '../config';
import {IPotassium} from '../crypto/potassium/ipotassium';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {SecretBox} from '../crypto/potassium/secret-box';
import {EventManager, eventManager} from '../event-manager';
import {UIEvents} from '../files/enums';
import {Transfer} from '../files/transfer';
import {firebaseApp} from '../firebase-app';
import {events, rpcEvents} from '../session/enums';
import {Message} from '../session/message';
import {Thread} from '../thread';
import {util} from '../util';
import {ChatService} from './chat.service';
import {ConfigService} from './config.service';
import {DialogService} from './dialog.service';
import {FileService} from './file.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages file transfers within a chat. Files are transmitted using Firebase Storage.
 * For encryption, native crypto is preferred when available for performance reasons,
 * but libsodium in a separate thread is used as a fallback.
 */
@Injectable()
export class FileTransferService {
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
						await potassium.secretBox.keyBytes
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
	private addImage (transfer: Transfer, plaintext: Uint8Array) : void {
		this.chatService.addMessage(
			`![](${this.fileService.toDataURI(plaintext, transfer.fileType)})` +
				`\n\n#### ${transfer.name}`
			,
			transfer.author,
			undefined,
			undefined,
			transfer.imageSelfDestructTimeout
		);
	}

	/** @ignore */
	private async decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		try {
			return this.nativeSecretBox ?
				await this.nativeSecretBox.open(cyphertext, key) :
				(await FileTransferService.cryptoThread({cyphertext, key}))[0]
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
					await this.nativeSecretBox.keyBytes
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
				const results	= await FileTransferService.cryptoThread({plaintext});

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

				this.sessionService.send(new Message(
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
						url: transfer.url
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
		this.sessionService.trigger(events.filesUI, {event, args});
	}

	/**
	 * Sends file.
	 * @param file
	 * @param image If true, file is processed as an image
	 * (compressed and displayed in the message list).
	 * @param imageSelfDestructTimeout
	 */
	public async send (
		file: File,
		image: boolean = this.fileService.isImage(file),
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		const plaintext	= await this.fileService.getBytes(file, image);

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
			file.name,
			file.type,
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

		this.sessionService.send(new Message(
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

					this.sessionService.send(new Message(
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
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) { (async () => {
		const isNativeCryptoSupported	= await potassiumUtil.isNativeCryptoSupported();

		if (isNativeCryptoSupported) {
			this.sessionService.on(events.beginChat, () => {
				this.sessionService.send(new Message(rpcEvents.files));
			});
		}

		const downloadAnswers	= new Map<string, boolean>();

		this.sessionService.on(rpcEvents.files, async (transfer: Transfer) => {
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
								this.sessionService.send(new Message(rpcEvents.files, transfer));
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

		this.sessionService.on(
			this.sessionService.events.filesUI,
			async (e: {
				args: any[];
				event: UIEvents;
			}) => {
				switch (e.event) {
					case UIEvents.completed: {
						const transfer: Transfer	= e.args[0];
						const plaintext: Uint8Array	= e.args[1];

						if (transfer.answer && transfer.image) {
							this.addImage(transfer, plaintext);
						}
						else {
							const message: string	= transfer.answer ?
								this.stringsService.outgoingFileSaved :
								this.stringsService.outgoingFileRejected
							;

							this.chatService.addMessage(
								`${message} ${transfer.name}`,
								this.sessionService.users.app
							);
						}
						break;
					}
					case UIEvents.confirm: {
						const transfer: Transfer				= e.args[0];
						const isSave: boolean					= e.args[1];
						const callback: (ok: boolean) => void	= e.args[2];

						const title	=
							`${this.stringsService.incomingFile} ${transfer.name} ` +
							`(${util.readableByteLength(transfer.size)})`
						;

						callback(
							(
								!isSave &&
								transfer.size < this.configService.filesConfig.approvalLimit
							) ||
							(isSave && transfer.image) ||
							await this.dialogService.confirm({
								title,
								cancel: isSave ?
									this.stringsService.discard :
									this.stringsService.reject
								,
								content: isSave ?
									this.stringsService.incomingFileSave :
									this.stringsService.incomingFileDownload
								,
								ok: isSave ?
									this.stringsService.save :
									this.stringsService.accept
							})
						);
						break;
					}
					case UIEvents.rejected: {
						const transfer: Transfer	= e.args[0];

						this.chatService.addMessage(
							`${this.stringsService.incomingFileRejected} ${transfer.name}`,
							this.sessionService.users.app,
							undefined,
							false
						);
						break;
					}
					case UIEvents.save: {
						const transfer: Transfer	= e.args[0];
						const plaintext: Uint8Array	= e.args[1];

						if (transfer.image) {
							this.addImage(transfer, plaintext);
						}
						else {
							util.saveFile(plaintext, transfer.name);
						}
						break;
					}
					case UIEvents.started: {
						const transfer: Transfer	= e.args[0];

						const message: string	=
							transfer.author === this.sessionService.users.me ?
								this.stringsService.fileTransferInitMe :
								this.stringsService.fileTransferInitFriend
						;

						if (!transfer.image) {
							this.chatService.addMessage(
								`${message} ${transfer.name}`,
								this.sessionService.users.app
							);
						}
						break;
					}
					case UIEvents.tooLarge: {
						this.dialogService.alert({
							content: this.stringsService.fileTooLarge,
							ok: this.stringsService.ok,
							title: this.stringsService.oopsTitle
						});
						break;
					}
				}
			}
		);
	})(); }
}
