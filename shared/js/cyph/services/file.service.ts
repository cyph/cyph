import {Injectable} from '@angular/core';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IFile} from '../ifile';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';


/**
 * Manages files.
 */
@Injectable()
export class FileService {
	/** @ignore */
	private async compressImage (image: HTMLImageElement, file: Blob|IFile) : Promise<Uint8Array> {
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
			(file instanceof Blob ? file.type : file.mediaType) !== 'image/jpeg' &&
			context.getImageData(0, 0, image.width, image.height).data[3] !== 255
		;

		const outputType: string|undefined		= !hasTransparency ? 'image/jpeg' : undefined;
		const outputQuality: number|undefined	= !hasTransparency ?
			Math.min(960 / Math.max(canvas.width, canvas.height), 1) :
			undefined
		;

		/* tslint:disable-next-line:no-unbound-method */
		if (canvas.toBlob && !(this.envService.isCordova && this.envService.isAndroid)) {
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

	/** Converts data URI to blob. */
	public fromDataURI (dataURI: string) : Blob {
		const arr		= dataURI.split(';base64,');
		const mediaType	= arr[0].slice(5);
		const bytes		= potassiumUtil.fromBase64(arr[1]);

		return new Blob([bytes], {type: mediaType});
	}

	/**
	 * Converts File/Blob to byte array.
	 * @param image If true, file is processed as an image (compressed).
	 */
	public async getBytes (
		file: Blob|IFile,
		image: boolean = this.isImage(file)
	) : Promise<Uint8Array> {
		if (
			!image ||
			(file instanceof Blob ? file.type : file.mediaType) === 'image/gif' ||
			!this.envService.isWeb
		) {
			/* TODO: HANDLE NATIVE */
			return file instanceof Blob ? potassiumUtil.fromBlob(file) : file.data;
		}

		const compressImage	= async (dataURI: string) => new Promise<Uint8Array>(resolve => {
			const img	= document.createElement('img');
			img.onload	= () => { resolve(this.compressImage(img, file)); };
			img.src		= dataURI;
		});

		if (!(file instanceof Blob)) {
			return compressImage(this.toDataURI(file.data, file.mediaType));
		}

		return new Promise<Uint8Array>((resolve, reject) => {
			const reader	= new FileReader();
			reader.onerror	= reject;
			reader.onload	= () => { resolve(compressImage(reader.result)); };

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

	/**
	 * Converts File/Blob to IFile.
	 */
	public async getIFile (file: Blob) : Promise<IFile> {
		return {
			data: await this.getBytes(file, false),
			mediaType: file.type,
			name: file instanceof File ? file.name : 'File'
		};
	}

	/** Indicates whether a File/Blob is an image. */
	public isImage (file: Blob|IFile) : boolean {
		return (file instanceof Blob ? file.type : file.mediaType).indexOf('image/') === 0;
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
