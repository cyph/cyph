
			let imageFile;
			let photoMax	= 1920;
			let canvas		= document.createElement('canvas');
			let ctx			= canvas.getContext('2d');
			let img			= new Image;
			let reader		= new FileReader;

			function sendImage (result) {
				sendMessage('![](' + result + ')');
			}

			reader.onload	= () => {
				sendImage(reader.result);
			};

			img.onload	= () => {
				let widthFactor		= photoMax / img.width;
				widthFactor			= widthFactor > 1 ? 1 : widthFactor;
				let heightFactor	= photoMax / img.height;
				heightFactor		= heightFactor > 1 ? 1 : heightFactor;
				let factor			= Math.min(widthFactor, heightFactor);

				canvas.width		= img.width * factor;
				canvas.height		= img.height * factor;

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				let hasTransparency	=
					imageFile.type !== 'image/jpeg' &&
					ctx.getImageData(0, 0, img.width, img.height).data[3] !== 255
				;

				let result	= hasTransparency ? canvas.toDataURL() : canvas.toDataURL(
					'image/jpeg',
					Math.min(960 / Math.max(canvas.width, canvas.height), 1)
				);

				URL.revokeObjectURL(img.src);

				sendImage(result);
			};

			/* More reliable hack to handle these buttons */
			$(() => {
				UI.Elements.buttons.find('input[type="file"]').each(() => {
					let elem	= this;

					let isClicked;

					$(this).click((e) => {
						e.stopPropagation();
						e.preventDefault();
					}).parent().click(() => {
						if (!isClicked) {
							isClicked	= true;

							let e	= document.createEvent('MouseEvents');
							e.initEvent('click', true, false);
							elem.dispatchEvent(e);

							let finish, intervalId;

							finish	= () => {
								clearInterval(intervalId);
								setTimeout(() => {
									isClicked	= false;
								}, 500);
							};

							intervalId	= setInterval(() => {
								if (elem.files.length > 0) {
									finish();
								}
							}, 500);

							setTimeout(finish, 5000);
						}
					});
				});
			});

			public insertPhoto (elem) {
				if (elem.files && elem.files.length > 0) {
					imageFile	= elem.files[0];

					if (imageFile.type === 'image/gif') {
						reader.readAsDataURL(imageFile);
					}
					else {
						img.src		= URL.createObjectURL(imageFile);
					}

					$(elem).val('');
				}
			};
