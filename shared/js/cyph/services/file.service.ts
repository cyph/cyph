import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IFile} from '../ifile';
import {EnvService} from './env.service';

/** Union of possible types that represent files. */
type FileLike = Blob | IFile | string | {mediaType: string};

/**
 * Manages files.
 */
@Injectable()
export class FileService extends BaseProvider {
	/** @ignore */
	private readonly canvas = this.envService.isWeb ?
		document.createElement('canvas') :
		undefined;

	/** @ignore */
	private readonly canvasContext = this.canvas?.getContext('2d') || undefined;

	/** Upper limit in bytes for a file to get the multimedia treatment. */
	public readonly mediaSizeLimit = 5242880;

	/** @ignore */
	private async compressImage (
		image: HTMLImageElement,
		file: Blob | IFile
	) : Promise<Uint8Array> {
		try {
			if (!this.canvas || !this.canvasContext) {
				throw new Error('No canvas available.');
			}

			const factor = Math.min(
				this.envService.filesConfig.maxImageWidth / image.width,
				this.envService.filesConfig.maxImageWidth / image.height,
				1
			);

			this.canvas.width = image.width * factor;
			this.canvas.height = image.height * factor;

			this.canvasContext.drawImage(
				image,
				0,
				0,
				this.canvas.width,
				this.canvas.height
			);

			const hasTransparency =
				this.getMediaType(file) !== 'image/jpeg' &&
				this.canvasContext.getImageData(0, 0, image.width, image.height)
					.data[3] !== 255;

			const outputType = !hasTransparency ? 'image/jpeg' : undefined;
			const outputQuality = !hasTransparency ?
				Math.min(
					960 / Math.max(this.canvas.width, this.canvas.height),
					1
				) :
				undefined;

			return this.canvasToBytes(this.canvas, outputType, outputQuality);
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

	/** Extracts data from a canvas. */
	public async canvasToBytes (
		canvas: HTMLCanvasElement,
		outputType: string = 'image/png',
		outputQuality?: number
	) : Promise<Uint8Array> {
		/* eslint-disable-next-line @typescript-eslint/unbound-method */
		if (
			canvas.toBlob &&
			!(this.envService.isCordova && this.envService.isAndroid)
		) {
			return new Promise<Uint8Array>(resolve => {
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
			this.compressImage(await this.toImageElement(dataURI), file);

		if (!(file instanceof Blob)) {
			return compressImage(this.toDataURI(file.data, file.mediaType));
		}

		return new Promise<Uint8Array>((resolve, reject) => {
			/* Workaround for Electron */
			let reader = new FileReader();
			if ((<any> reader)._realReader) {
				reader = (<any> reader)._realReader;
			}

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
	 * @param image If true, file is processed as an image (compressed).
	 */
	public async getIFile (
		file: Blob | File,
		image?: boolean
	) : Promise<IFile> {
		return {
			data: await this.getBytes(file, image),
			mediaType: file.type,
			name: 'name' in file ? file.name : 'File'
		};
	}

	/** Gets raw image data. */
	public async getImageData (
		image: HTMLImageElement | HTMLVideoElement
	) : Promise<ImageData> {
		if (!this.canvas || !this.canvasContext) {
			throw new Error('No canvas available.');
		}

		/* https://github.com/cordova-rtc/cordova-plugin-iosrtc/issues/116#issuecomment-532142297 */
		if (
			this.envService.isCordovaMobileIOS &&
			image instanceof HTMLVideoElement &&
			typeof (<any> image).render?.save === 'function'
		) {
			const dataURI = await new Promise<string | undefined>(resolve => {
				(<any> image).render.save((data: any) => {
					resolve(
						typeof data === 'string' && data.length > 0 ?
							`data:image/jpeg;base64,${data}` :
							undefined
					);
				});
			});

			if (!dataURI) {
				return {
					data: new Uint8ClampedArray(0),
					height: 0,
					width: 0
				};
			}

			image = await this.toImageElement(dataURI);
		}

		const height =
			image instanceof HTMLImageElement ?
				image.height :
				image.videoHeight;

		const width =
			image instanceof HTMLImageElement ? image.width : image.videoWidth;

		if (height < 1 || width < 1) {
			return {
				data: new Uint8ClampedArray(0),
				height,
				width
			};
		}

		this.canvas.height = height;
		this.canvas.width = width;

		this.canvasContext.drawImage(image, 0, 0, width, height);
		return this.canvasContext.getImageData(0, 0, width, height);
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

	/** Indicates whether video is ended (including handling iOS WebRTC plugin). */
	public isVideoEnded (video: HTMLVideoElement) : boolean {
		return (
			video.ended &&
			!(
				this.envService.isCordovaMobileIOS &&
				video.srcObject &&
				'active' in video.srcObject &&
				video.srcObject.active
			)
		);
	}

	/** Converts binary data to base64 data URI. */
	public toDataURI (data: Uint8Array, mediaType: string) : string {
		return `data:${mediaType};base64,${potassiumUtil.toBase64(data)}`;
	}

	/** Converts binary data to base64 data URI. */
	public async toImageElement (
		data: Uint8Array | string
	) : Promise<HTMLImageElement> {
		const img = document.createElement('img');

		const imgLoaded = new Promise(resolve => {
			img.onload = () => {
				resolve();
			};
		});

		img.src =
			typeof data === 'string' ? data : this.toDataURI(data, 'image/png');

		await imgLoaded;

		return img;
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
