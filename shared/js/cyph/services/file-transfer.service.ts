import {ChangeDetectorRef, Injectable} from '@angular/core';
import {config} from '../config';
import {SecretBox} from '../crypto/potassium/secret-box';
import {eventManager} from '../event-manager';
import {UIEvents} from '../files/enums';
import {Transfer} from '../files/transfer';
import {events, rpcEvents, users} from '../session/enums';
import {Message} from '../session/message';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {ConfigService} from './config.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
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
	private resolveSecretBox: (secretBox: SecretBox) => void;

	/** @ignore */
	private readonly secretBox: Promise<SecretBox>	=
		/* tslint:disable-next-line:promise-must-complete */
		new Promise<SecretBox>(resolve => {
			this.resolveSecretBox	= resolve;
		})
	;

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
	private async decryptFile (cyphertext: Uint8Array, key: Uint8Array) : Promise<Uint8Array> {
		try {
			return (await (await this.secretBox).open(cyphertext, key));
		}
		catch (_) {
			return this.potassiumService.fromString('File decryption failed.');
		}
	}

	/** @ignore */
	private async encryptFile (plaintext: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		key: Uint8Array;
	}> {
		try {
			const key: Uint8Array	= this.potassiumService.randomBytes(
				await (await this.secretBox).keyBytes
			);

			return {
				cyphertext: await (await this.secretBox).seal(plaintext, key),
				key
			};
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

					(await this.databaseService.getStorageRef(transfer.url)).delete();

					const plaintext: Uint8Array	= await this.decryptFile(cyphertext, transfer.key);

					transfer.percentComplete	= 100;
					this.triggerChangeDetection();
					this.potassiumService.clearMemory(transfer.key);
					this.triggerUIEvent(UIEvents.save, transfer, plaintext);
					await util.sleep(1000);
					this.transfers.delete(transfer);
					this.triggerChangeDetection();
				}
				else {
					this.triggerUIEvent(UIEvents.rejected, transfer);
					(await this.databaseService.getStorageRef(transfer.url)).delete();
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

			this.analyticsService.sendEvent({
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

		this.analyticsService.sendEvent({
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

			uploadTask	= (await this.databaseService.getStorageRef(path)).put(
				new Blob([o.cyphertext])
			);

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
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) { (async () => {
		const isNativeCryptoSupported	= await this.potassiumService.isNativeCryptoSupported();

		this.sessionService.one(events.beginChat).then(() => {
			this.sessionService.send(new Message(rpcEvents.files, {isNativeCryptoSupported}));
		});

		const downloadAnswers	= new Map<string, boolean>();

		this.sessionService.one<{isNativeCryptoSupported: boolean}>(rpcEvents.files).then(o => {
			/* Negotiation on whether or not to use SubtleCrypto */
			this.resolveSecretBox(
				isNativeCryptoSupported && o.isNativeCryptoSupported ?
					new SecretBox(true) :
					this.potassiumService.secretBox
			);

			this.sessionService.on(rpcEvents.files, async (transfer: Transfer) => {
				if (!transfer.id) {
					return;
				}

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
			});
		});

		this.sessionService.on(
			events.filesUI,
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
								users.app
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
							users.app,
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
							transfer.author === users.me ?
								this.stringsService.fileTransferInitMe :
								this.stringsService.fileTransferInitFriend
						;

						if (!transfer.image) {
							this.chatService.addMessage(
								`${message} ${transfer.name}`,
								users.app
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
