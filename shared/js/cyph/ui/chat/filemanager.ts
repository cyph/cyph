import {Config} from '../../config';
import {Potassium} from '../../crypto/potassium';
import {UIEvents} from '../../files/enums';
import {Files} from '../../files/files';
import {IFiles} from '../../files/ifiles';
import {ITransfer} from '../../files/itransfer';
import {Events, Users} from '../../session/enums';
import {Strings} from '../../strings';
import {Util} from '../../util';
import {IDialogManager} from '../idialogmanager';
import {IChat} from './ichat';
import {IFileManager} from './ifilemanager';


/** @inheritDoc */
export class FileManager implements IFileManager {
	/** @inheritDoc */
	public readonly files: IFiles;

	/** @ignore */
	private async compressImage (image: HTMLImageElement, file: File) : Promise<Uint8Array> {
		const canvas: HTMLCanvasElement			= document.createElement('canvas');
		const context: CanvasRenderingContext2D	=
			<CanvasRenderingContext2D> canvas.getContext('2d')
		;

		let widthFactor: number		= Config.filesConfig.maxImageWidth / image.width;
		let heightFactor: number	= Config.filesConfig.maxImageWidth / image.height;

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

		return new Promise<Uint8Array>(resolve => {
			const callback	= (blob: Blob) => {
				const reader	= new FileReader();
				reader.onload	= () => resolve(new Uint8Array(reader.result));
				reader.readAsArrayBuffer(blob);
			};

			if (hasTransparency) {
				canvas.toBlob(callback);
			}
			else {
				canvas.toBlob(
					callback,
					'image/jpeg',
					Math.min(960 / Math.max(canvas.width, canvas.height), 1)
				);
			}
		});
	}

	/** @ignore */
	private addImage (transfer: ITransfer, plaintext: Uint8Array) : void {
		this.chat.addMessage(
			`![](data:${transfer.type};base64,${Potassium.toBase64(plaintext)})` +
				`\n\n#### ${transfer.name}`
			,
			transfer.author,
			undefined,
			undefined,
			transfer.imageSelfDestructTimeout
		);
	}

	/** @inheritDoc */
	public async send (
		file: File,
		image: boolean = file.type.indexOf('image/') === 0,
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		const plaintext	= await new Promise<Uint8Array>(resolve => {
			const reader	= new FileReader();

			if (image && file.type === 'image/gif') {
				reader.onload	= () => {
					const img	= document.createElement('img');
					img.onload	= () => resolve(this.compressImage(img, file));
					img.src		= reader.result;
				};

				reader.readAsDataURL(file);
			}
			else {
				reader.onload	= () => resolve(new Uint8Array(reader.result));
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
		private readonly chat: IChat,

		/** @ignore */
		private readonly dialogManager: IDialogManager
	) {
		this.files	= new Files(this.chat.session);

		this.chat.session.on(
			Events.filesUI,
			async (e: {
				event: UIEvents;
				args: any[];
			}) => {
				switch (e.event) {
					case UIEvents.completed: {
						const transfer: ITransfer	= e.args[0];
						const plaintext: Uint8Array	= e.args[1];

						if (transfer.answer && transfer.image) {
							this.addImage(transfer, plaintext);
						}
						else {
							const message: string	= transfer.answer ?
								Strings.outgoingFileSaved :
								Strings.outgoingFileRejected
							;

							this.chat.addMessage(
								`${message} ${transfer.name}`,
								Users.app
							);
						}
						break;
					}
					case UIEvents.confirm: {
						const transfer: ITransfer				= e.args[0];
						const isSave: boolean					= e.args[1];
						const callback: (ok: boolean) => void	= e.args[2];

						const title	=
							`${Strings.incomingFile} ${transfer.name} ` +
							`(${Util.readableByteLength(transfer.size)})`
						;

						callback(
							(!isSave && transfer.size < Config.filesConfig.approvalLimit) ||
							(isSave && transfer.image) ||
							await this.dialogManager.confirm({
								title,
								cancel: isSave ?
									Strings.discard :
									Strings.reject
								,
								content: isSave ?
									Strings.incomingFileSave :
									Strings.incomingFileDownload
								,
								ok: isSave ?
									Strings.save :
									Strings.accept
							})
						);
						break;
					}
					case UIEvents.rejected: {
						const transfer: ITransfer	= e.args[0];

						this.chat.addMessage(
							`${Strings.incomingFileRejected} ${transfer.name}`,
							Users.app,
							undefined,
							false
						);
						break;
					}
					case UIEvents.save: {
						const transfer: ITransfer	= e.args[0];
						const plaintext: Uint8Array	= e.args[1];

						if (transfer.image) {
							this.addImage(transfer, plaintext);
						}
						else {
							Util.saveFile(plaintext, transfer.name);
						}
						break;
					}
					case UIEvents.started: {
						const transfer: ITransfer	= e.args[0];

						const message: string	= transfer.author === Users.me ?
							Strings.fileTransferInitMe :
							Strings.fileTransferInitFriend
						;

						if (!transfer.image) {
							this.chat.addMessage(
								`${message} ${transfer.name}`,
								Users.app
							);
						}
						break;
					}
					case UIEvents.tooLarge: {
						this.dialogManager.alert({
							content: Strings.fileTooLarge,
							ok: Strings.ok,
							title: Strings.oopsTitle
						});
						break;
					}
				}
			}
		);
	}
}
