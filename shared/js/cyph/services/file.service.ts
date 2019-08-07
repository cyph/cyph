import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IFile} from '../ifile';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';

/** Union of possible types that represent files. */
type FileLike = Blob | IFile | string | {mediaType: string};

/**
 * Manages files.
 */
@Injectable()
export class FileService extends BaseProvider {
	/** Upper limit in bytes for a file to get the multimedia treatment. */
	public readonly mediaSizeLimit = 5242880;

	/** @ignore */
	private async compressImage (
		image: HTMLImageElement,
		file: Blob | IFile
	) : Promise<Uint8Array> {
		try {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');

			if (!context) {
				throw new Error('No canvas context.');
			}

			const factor = Math.min(
				this.configService.filesConfig.maxImageWidth / image.width,
				this.configService.filesConfig.maxImageWidth / image.height,
				1
			);

			canvas.width = image.width * factor;
			canvas.height = image.height * factor;

			context.drawImage(image, 0, 0, canvas.width, canvas.height);

			const hasTransparency =
				this.getMediaType(file) !== 'image/jpeg' &&
				context.getImageData(0, 0, image.width, image.height)
					.data[3] !== 255;

			const outputType = !hasTransparency ? 'image/jpeg' : undefined;
			const outputQuality = !hasTransparency ?
				Math.min(960 / Math.max(canvas.width, canvas.height), 1) :
				undefined;

			/* tslint:disable-next-line:no-unbound-method */
			if (
				canvas.toBlob &&
				!(this.envService.isCordova && this.envService.isAndroid)
			) {
				return await new Promise<Uint8Array>(resolve => {
					canvas.toBlob(
						blob => {
							resolve(
								!blob ?
									new Uint8Array(0) :
									potassiumUtil.fromBlob(blob)
							);
						},
						outputType,
						outputQuality
					);
				});
			}

			return potassiumUtil.fromBase64(
				canvas.toDataURL(outputType, outputQuality).split(',')[1]
			);
		}
		catch {}

		return file instanceof Blob ? potassiumUtil.fromBlob(file) : file.data;
	}

	/** @ignore */
	private getMediaType (file: FileLike) : string {
		return typeof file === 'string' ?
			file :
		file instanceof Blob ?
			file.type :
			file.mediaType;
	}

	/** Converts data URI to blob. */
	public fromDataURI (dataURI: FileLike) : Blob {
		if (dataURI instanceof Blob) {
			return dataURI;
		}

		const {data, mediaType} =
			typeof dataURI === 'string' ?
				(() => {
					const arr = dataURI.split(';base64,');
					return {
						data: potassiumUtil.fromBase64(arr[1]),
						mediaType: arr[0].slice(5)
					};
				})() :
			'data' in dataURI ?
				dataURI :
				{...dataURI, data: new Uint8Array(0)};

		return new Blob([data], {type: mediaType});
	}

	/**
	 * Converts File/Blob to byte array.
	 * @param image If true, file is processed as an image when possible (compressed).
	 */
	public async getBytes (
		file: Blob | IFile,
		image: boolean = true
	) : Promise<Uint8Array> {
		image = image && this.isImage(file, true);

		if (
			!image ||
			this.getMediaType(file) === 'image/gif' ||
			!this.envService.isWeb
		) {
			/* TODO: HANDLE NATIVE */
			return file instanceof Blob ?
				potassiumUtil.fromBlob(file) :
				file.data;
		}

		const compressImage = async (dataURI: string) =>
			new Promise<Uint8Array>(resolve => {
				const img = document.createElement('img');
				img.onload = () => {
					resolve(this.compressImage(img, file));
				};
				img.src = dataURI;
			});

		if (!(file instanceof Blob)) {
			return compressImage(this.toDataURI(file.data, file.mediaType));
		}

		return new Promise<Uint8Array>((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = reject;
			reader.onload = () => {
				resolve(
					typeof reader.result === 'string' ?
						compressImage(reader.result) :
						new Uint8Array(0)
				);
			};

			reader.readAsDataURL(file);
		});
	}

	/**
	 * Converts File/Blob to base64 data URI.
	 * @param image If true, file is processed as an image (compressed).
	 */
	public async getDataURI (file: Blob, image?: boolean) : Promise<string> {
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

	/** Indicates whether a File/Blob is audio. */
	public isAudio (file: FileLike) : boolean {
		return this.getMediaType(file).startsWith('audio/');
	}

	/** Indicates whether a File/Blob is an image. */
	public isImage (file: FileLike, includeSVG: boolean = false) : boolean {
		const mediaType = this.getMediaType(file);

		return (
			mediaType.startsWith('image/') &&
			(includeSVG || !mediaType.startsWith('image/svg'))
		);
	}

	/** Indicates whether a File/Blob is multimedia. */
	public isMedia (file: FileLike, includeSVG: boolean = false) : boolean {
		return (
			(this.isAudio(file) ||
				this.isImage(file, includeSVG) ||
				this.isVideo(file)) &&
			this.fromDataURI(file).size <= this.mediaSizeLimit
		);
	}

	/** Indicates whether a File/Blob is a video. */
	public isVideo (file: FileLike) : boolean {
		return this.getMediaType(file).startsWith('video/');
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
	) {
		super();
	}
}
