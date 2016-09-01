import {IChat} from 'ichat';
import {IElements} from 'ielements';
import {IFileManager} from 'ifilemanager';
import {Config} from 'cyph/config';
import {IController} from 'cyph/icontroller';
import {Strings} from 'cyph/strings';
import {Util} from 'cyph/util';
import {IDialogManager} from 'ui/idialogmanager';
import * as Files from 'files/files';
import * as Session from 'session/session';


export class FileManager implements IFileManager {
	public files: Files.IFiles;

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

	private sendImage (encodedImage: string) : void {
		this.chat.send('![](' + encodedImage + ')');
	}

	private watchFileInputButtonClick (elem: HTMLElement) : void {
		let isClicked: boolean;

		$(elem).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			}).
			parent().click(() => {
				if (!isClicked) {
					isClicked	= true;

					Util.triggerClick(elem);

					let finish: Function;

					const intervalId	= setInterval(() => {
						if (Util.getValue(elem, 'files', []).length > 0) {
							finish();
						}
					}, 500);

					finish	= () => {
						clearInterval(intervalId);
						setTimeout(() =>
							isClicked	= false
						, 500);
					};

					setTimeout(finish, 5000);
				}
			})
		;
	}

	public send (elem: HTMLInputElement, processImage?: boolean) : void {
		if (elem.files.length > 0) {
			const file: File			= elem.files[0];
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

			$(elem).val('');
		}
	}

	/**
	 * @param chat
	 */
	public constructor (
		private chat: IChat,
		private controller: IController,
		private dialogManager: IDialogManager,
		private elements: IElements
	) {
		this.files	= new Files.Files(this.chat.session, this.controller);

		this.elements.buttons.each((i: number, parent: HTMLElement) =>
			new MutationObserver(mutations => {
				for (let mutation of mutations) {
					for (let i = 0 ; i < mutation.addedNodes.length ; ++i) {
						const elem: Node	= mutation.addedNodes[i];

						if (
							(elem['tagName'] || '').toLowerCase() === 'input' &&
							elem['type'] === 'file'
						) {
							this.watchFileInputButtonClick(<HTMLElement> elem);
						}
					}
				}
			}).observe(parent, {
				childList: true,
				attributes: false,
				characterData: false,
				subtree: false
			})
		);

		this.elements.buttons.
			find('input[type="file"]').
			each((i: number, elem: HTMLElement) =>
				this.watchFileInputButtonClick(elem)
			)
		;



		this.chat.session.on(
			Session.Events.filesUI,
			async (e: {
				event: Files.UIEvents;
				args: any[];
			}) => {
				switch (e.event) {
					case Files.UIEvents.completed: {
						const name: string		= e.args[0];
						const answer: boolean	= e.args[1];

						const message: string	= answer ?
							Strings.outgoingFileSaved :
							Strings.outgoingFileRejected
						;

						this.chat.addMessage(
							message + ' ' + name,
							Session.Users.app
						);
						break;
					}
					case Files.UIEvents.confirm: {
						const name: string						= e.args[0];
						const size: number						= e.args[1];
						const isSave: boolean					= e.args[2];
						const callback: (ok: boolean) => void	= e.args[3];

						const title: string	= `${Strings.incomingFile} ${name} (${Util.readableByteLength(size)})`;

						callback(await this.dialogManager.confirm({
							title,
							content: isSave ? Strings.incomingFileSave : Strings.incomingFileDownload,
							ok: isSave ? Strings.save : Strings.accept,
							cancel: isSave ? Strings.discard : Strings.reject
						}));
						break;
					}
					case Files.UIEvents.rejected: {
						const name: string		= e.args[0];

						this.chat.addMessage(
							Strings.incomingFileRejected + ' ' + name,
							Session.Users.app,
							undefined,
							false
						);
						break;
					}
					case Files.UIEvents.started: {
						const user: Session.Users	= e.args[0];
						const name: string			= e.args[1];

						const isFromMe: boolean	= user === Session.Users.me;
						const message: string	= isFromMe ?
							Strings.fileTransferInitMe :
							Strings.fileTransferInitFriend
						;

						this.chat.addMessage(
							message + ' ' + name,
							Session.Users.app,
							undefined,
							!isFromMe
						);
						break;
					}
					case Files.UIEvents.tooLarge: {
						this.dialogManager.alert({
							title: Strings.oopsTitle,
							content: Strings.fileTooLarge,
							ok: Strings.ok
						});
						break;
					}
				}
			}
		);
	}
}
