import {Injectable} from '@angular/core';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';


/**
 * Manages files.
 */
@Injectable()
export class FileService {
	/** @ignore */
	private async compressImage (image: HTMLImageElement, file: Blob) : Promise<Uint8Array> {
		const canvas: HTMLCanvasElement			= document.createElement('canvas');
		const context: CanvasRenderingContext2D	=
			<CanvasRenderingContext2D> canvas.getContext('2d')
		;

		let widthFactor: number		= this.configService.filesConfig.maxImageWidth / image.width;
		let heightFactor: number	= this.configService.filesConfig.maxImageWidth / image.height;

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

		/* tslint:disable-next-line:no-unbound-method */
		if (canvas.toBlob) {
			return new Promise<Uint8Array>(resolve => {
				canvas.toBlob(
					async blob => {
						resolve(!blob ? new Uint8Array(0) : await potassiumUtil.fromBlob(blob));
					},
					outputType,
					outputQuality
				);
			});
		}
		else {
			return potassiumUtil.fromBase64(
				canvas.toDataURL(outputType, outputQuality).split(',')[1]
			);
		}
	}

	/**
	 * Converts File/Blob to byte array.
	 * @param image If true, file is processed as an image (compressed).
	 */
	public async getBytes (file: Blob, image: boolean = this.isImage(file)) : Promise<Uint8Array> {
		if (!image || file.type === 'image/gif' || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return potassiumUtil.fromBlob(file);
		}

		return new Promise<Uint8Array>(resolve => {
			const reader	= new FileReader();

			reader.onload	= () => {
				const img	= document.createElement('img');
				img.onload	= () => { resolve(this.compressImage(img, file)); };
				img.src		= reader.result;
			};

			reader.readAsDataURL(file);
		});
	}

	/**
	 * Converts File/Blob to base64 data URI.
	 * @param image If true, file is processed as an image (compressed).
	 */
	public async getDataURI (file: Blob, image: boolean = this.isImage(file)) : Promise<string> {
		return this.toDataURI(await this.getBytes(file, image), file.type);
	}

	/** Indicates whether a File/Blob is an image. */
	public isImage (file: Blob) : boolean {
		return file.type.indexOf('image/') === 0;
	}

	/** Converts binary data to base64 data URI. */
	public toDataURI (data: Uint8Array, mediaType: string) : string {
		return `data:${mediaType};base64,${potassiumUtil.toBase64(data)}`;
	}

	constructor (
		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
