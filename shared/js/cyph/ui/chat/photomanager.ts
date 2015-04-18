/// <reference path="../elements.ts" />
/// <reference path="../../config.ts" />
/// <reference path="../../util.ts" />
/// <reference path="../../session/isession.ts" />
/// <reference path="../../../global/base.ts" />
/// <reference path="../../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export class PhotoManager {
			private session: Session.ISession;

			private processImage (image: HTMLImageElement, file: File) : void {
				let canvas	= document.createElement('canvas');
				let ctx		= canvas.getContext('2d');

				let widthFactor: number		= Config.photoConfig.maxWidth / image.width;
				widthFactor					= widthFactor > 1 ? 1 : widthFactor;

				let heightFactor: number	= Config.photoConfig.maxWidth / image.height;
				heightFactor				= heightFactor > 1 ? 1 : heightFactor;

				let factor: number	= Math.min(widthFactor, heightFactor);

				canvas.width	= image.width * factor;
				canvas.height	= image.height * factor;

				ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

				let hasTransparency: boolean	=
					file.type !== 'image/jpeg' &&
					ctx.getImageData(0, 0, image.width, image.height).data[3] !== 255
				;

				let encodedImage: string	=
					hasTransparency ?
						canvas.toDataURL() :
						canvas.toDataURL(
							'image/jpeg',
							Math.min(960 / Math.max(canvas.width, canvas.height), 1)
						)
				;

				URL.revokeObjectURL(image.src);

				this.send(encodedImage);
			}

			private send (encodedImage: string) : void {
				this.session.sendText('![](' + encodedImage + ')');
			}

			public insertPhoto (elem: HTMLElement) : void {
				let files: File[]	= Util.getValue(elem, 'files', []);

				if (files.length > 0) {
					let file: File	= files[0];

					if (file.type === 'image/gif') {
						let reader: FileReader	= new FileReader;
						reader.onload			= () => this.send(reader.result);
						reader.readAsDataURL(file);
					}
					else {
						let image: HTMLImageElement	= new Image;
						image.onload				= () => this.processImage(image, file);
						image.src					= URL.createObjectURL(file);
					}

					$(elem).val('');
				}
			}

			public constructor (session: Session.ISession) {
				this.session	= session;

				Elements.buttons.
					find('input[type="file"]').
					each((i: number, elem: HTMLElement) => {
						let isClicked: boolean;

						$(elem).
							click((e: Event) => {
								e.stopPropagation();
								e.preventDefault();
							}).
							parent().click(() => {
								if (!isClicked) {
									isClicked	= true;

									Util.triggerClick(elem);

									let finish: Function;

									let intervalId	= setInterval(() => {
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
					})
				;
			}
		}
	}
}
