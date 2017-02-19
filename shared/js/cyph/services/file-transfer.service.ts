import {Injectable} from '@angular/core';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {UIEvents} from '../files/enums';
import {Files} from '../files/files';
import {Transfer} from '../files/transfer';
import {util} from '../util';
import {ChatService} from './chat.service';
import {ConfigService} from './config.service';
import {DialogService} from './dialog.service';
import {FileService} from './file.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages file transfers within a chat.
 */
@Injectable()
export class FileTransferService {
	/** @see Files */
	public readonly files: Files;

	/** @ignore */
	private addImage (transfer: Transfer, plaintext: Uint8Array) : void {
		this.chatService.addMessage(
			`![](data:${transfer.fileType};base64,${potassiumUtil.toBase64(plaintext)})` +
				`\n\n#### ${transfer.name}`
			,
			transfer.author,
			undefined,
			undefined,
			transfer.imageSelfDestructTimeout
		);
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
		this.files.send(
			await this.fileService.getBytes(file, image),
			file.name,
			file.type,
			image,
			imageSelfDestructTimeout
		);
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
	) {
		this.files	= new Files(this.sessionService);

		this.sessionService.on(
			this.sessionService.events.filesUI,
			async (e: {
				event: UIEvents;
				args: any[];
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
	}
}
