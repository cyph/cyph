import {config} from '../../config';
import {potassium} from '../../crypto/potassium';
import {UIEvents} from '../../files/enums';
import {Files} from '../../files/files';
import {Transfer} from '../../files/transfer';
import {events, users} from '../../session/enums';
import {strings} from '../../strings';
import {util} from '../../util';
import {DialogManager} from '../dialogmanager';
import {Chat} from './chat';


/**
 * Manages files within a chat.
 */
export class FileManager {
	/** @see Files */
	public readonly files: Files;

	/** @ignore */
	private addImage (transfer: Transfer, plaintext: Uint8Array) : void {
		this.chat.addMessage(
			`![](data:${transfer.fileType};base64,${potassium.toBase64(plaintext)})` +
				`\n\n#### ${transfer.name}`
			,
			transfer.author,
			undefined,
			undefined,
			transfer.imageSelfDestructTimeout
		);
	}

	/** @ignore */
	private async compressImage (image: HTMLImageElement, file: File) : Promise<Uint8Array> {
		const canvas: HTMLCanvasElement			= document.createElement('canvas');
		const context: CanvasRenderingContext2D	=
			<CanvasRenderingContext2D> canvas.getContext('2d')
		;

		let widthFactor: number		= config.filesConfig.maxImageWidth / image.width;
		let heightFactor: number	= config.filesConfig.maxImageWidth / image.height;

		if (widthFactor > 1) {
			widthFactor		= 1;
		}
		if (heightFactor > 1) {
			heightFactor	= 1;
		}

		const factor: number	= Math.min(widthFactor, heightFactor);

		canvas.width	= image.width * factor;
		canvas.height	= image.height * factor;

		context.drawImage(image, 0, 0, canvas.width, canvas.height);

		const hasTransparency: boolean	=
			file.type !== 'image/jpeg' &&
			context.getImageData(0, 0, image.width, image.height).data[3] !== 255
		;

		const outputType: string|undefined		= !hasTransparency ? 'image/jpeg' : undefined;
		const outputQuality: number|undefined	= !hasTransparency ?
			Math.min(960 / Math.max(canvas.width, canvas.height), 1) :
			undefined
		;

		if (canvas.toBlob) {
			return new Promise<Uint8Array>(resolve => { canvas.toBlob(
				(blob: Blob) => {
					const reader	= new FileReader();
					reader.onload	= () => { resolve(new Uint8Array(reader.result)); };
					reader.readAsArrayBuffer(blob);
				},
				outputType,
				outputQuality
			); });
		}
		else {
			return potassium.fromBase64(
				canvas.toDataURL(outputType, outputQuality).split(',')[1]
			);
		}
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
		image: boolean = file.type.indexOf('image/') === 0,
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		const plaintext	= await new Promise<Uint8Array>(resolve => {
			const reader	= new FileReader();

			if (image && file.type !== 'image/gif') {
				reader.onload	= () => {
					const img	= document.createElement('img');
					img.onload	= () => { resolve(this.compressImage(img, file)); };
					img.src		= reader.result;
				};

				reader.readAsDataURL(file);
			}
			else {
				reader.onload	= () => { resolve(new Uint8Array(reader.result)); };
				reader.readAsArrayBuffer(file);
			}
		});

		this.files.send(
			plaintext,
			file.name,
			file.type,
			image,
			imageSelfDestructTimeout
		);
	}

	constructor (
		/** @ignore */
		private readonly chat: Chat,

		/** @ignore */
		private readonly dialogManager: DialogManager
	) {
		this.files	= new Files(this.chat.session);

		this.chat.session.on(
			events.filesUI,
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
								strings.outgoingFileSaved :
								strings.outgoingFileRejected
							;

							this.chat.addMessage(
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
							`${strings.incomingFile} ${transfer.name} ` +
							`(${util.readableByteLength(transfer.size)})`
						;

						callback(
							(!isSave && transfer.size < config.filesConfig.approvalLimit) ||
							(isSave && transfer.image) ||
							await this.dialogManager.confirm({
								title,
								cancel: isSave ?
									strings.discard :
									strings.reject
								,
								content: isSave ?
									strings.incomingFileSave :
									strings.incomingFileDownload
								,
								ok: isSave ?
									strings.save :
									strings.accept
							})
						);
						break;
					}
					case UIEvents.rejected: {
						const transfer: Transfer	= e.args[0];

						this.chat.addMessage(
							`${strings.incomingFileRejected} ${transfer.name}`,
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

						const message: string	= transfer.author === users.me ?
							strings.fileTransferInitMe :
							strings.fileTransferInitFriend
						;

						if (!transfer.image) {
							this.chat.addMessage(
								`${message} ${transfer.name}`,
								users.app
							);
						}
						break;
					}
					case UIEvents.tooLarge: {
						this.dialogManager.alert({
							content: strings.fileTooLarge,
							ok: strings.ok,
							title: strings.oopsTitle
						});
						break;
					}
				}
			}
		);
	}
}
