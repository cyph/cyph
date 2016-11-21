import {Config} from '../../config';
import {UIEvents} from '../../files/enums';
import {Files} from '../../files/files';
import {IFiles} from '../../files/ifiles';
import {Events, Users} from '../../session/enums';
import {Strings} from '../../strings';
import {Util} from '../../util';
import {IDialogManager} from '../idialogmanager';
import {IChat} from './ichat';
import {IFileManager} from './ifilemanager';


/** @inheritDoc */
export class FileManager implements IFileManager {
	/** @inheritDoc */
	public files: IFiles;

	/** @ignore */
	private compressImage (image: HTMLImageElement, file: File) : string {
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

		const encodedImage: string	=
			hasTransparency ?
				canvas.toDataURL() :
				canvas.toDataURL(
					'image/jpeg',
					Math.min(960 / Math.max(canvas.width, canvas.height), 1)
				)
		;

		return encodedImage;
	}

	/** @ignore */
	private sendImage (encodedImage: string) : void {
		this.chat.send('![](' + encodedImage + ')');
	}

	/** @inheritDoc */
	public send (file: File, processImage?: boolean) : void {
		const reader: FileReader	= new FileReader();

		if (processImage) {
			reader.onload	= () => {
				if (file.type === 'image/gif') {
					this.sendImage(reader.result);
				}
				else {
					const image: HTMLImageElement	= new Image();

					image.onload	= () => this.sendImage(
						this.compressImage(image, file)
					);

					image.src		= reader.result;
				}
			};

			reader.readAsDataURL(file);
		}
		else {
			reader.onload	= () => this.files.send(
				new Uint8Array(reader.result),
				file.name
			);

			reader.readAsArrayBuffer(file);
		}
	}

	constructor (
		/** @ignore */
		private chat: IChat,

		/** @ignore */
		private dialogManager: IDialogManager
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
						const name: string		= e.args[0];
						const answer: boolean	= e.args[1];

						const message: string	= answer ?
							Strings.outgoingFileSaved :
							Strings.outgoingFileRejected
						;

						this.chat.addMessage(
							message + ' ' + name,
							Users.app
						);
						break;
					}
					case UIEvents.confirm: {
						const name: string						= e.args[0];
						const size: number						= e.args[1];
						const isSave: boolean					= e.args[2];
						const callback: (ok: boolean) => void	= e.args[3];

						const title: string	= `${Strings.incomingFile} ${name} (${Util.readableByteLength(size)})`;

						callback(await this.dialogManager.confirm({
							title,
							cancel: isSave ? Strings.discard : Strings.reject,
							content: isSave ? Strings.incomingFileSave : Strings.incomingFileDownload,
							ok: isSave ? Strings.save : Strings.accept
						}));
						break;
					}
					case UIEvents.rejected: {
						const name: string		= e.args[0];

						this.chat.addMessage(
							Strings.incomingFileRejected + ' ' + name,
							Users.app,
							undefined,
							false
						);
						break;
					}
					case UIEvents.started: {
						const user: string	= e.args[0];
						const name: string	= e.args[1];

						const isFromMe: boolean	= user === Users.me;
						const message: string	= isFromMe ?
							Strings.fileTransferInitMe :
							Strings.fileTransferInitFriend
						;

						this.chat.addMessage(
							message + ' ' + name,
							Users.app,
							undefined,
							!isFromMe
						);
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
