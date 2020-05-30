import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import * as Comlink from 'comlink';
import {DopeQrOptions, generateQRCode} from 'dope-qr';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../base-provider';
import {DataURIProto} from '../proto';
import {FileService} from './file.service';
import {WorkerService} from './worker.service';

/**
 * Angular service for QR codes.
 */
@Injectable()
export class QRService extends BaseProvider {
	/** Proxy for QR code scanner library inside a worker. */
	private readonly qrScanner = memoize(async () =>
		this.workerService
			.createThread<any>(
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts('/assets/node_modules/jsqr/dist/jsQR.js');

					(<any> self).Comlink.expose(
						{
							scan: (<any> self).jsQR
						},
						self
					);
				}
			)
			.then(async thread => thread.api)
	);

	/** Generates a QR code and caches to local storage. */
	public readonly getQRCode = memoize(
		async (options: DopeQrOptions) : Promise<SafeUrl> =>
			DataURIProto.decode(await generateQRCode(options), 'image/png')
	);

	/** Scans QR code (raw data). */
	private async scanQRCodeInternal (
		imageData: ImageData,
		transferToThread: boolean = true
	) : Promise<string | undefined> {
		const o = await (await this.qrScanner()).scan(
			transferToThread ?
				Comlink.transfer(imageData.data, [imageData.data.buffer]) :
				imageData.data,
			imageData.width,
			imageData.height
		);

		const {data} = o || {};

		return typeof data === 'string' ? data : undefined;
	}

	/** Scans QR code. */
	public async scanQRCode (
		image: HTMLImageElement | HTMLVideoElement | Uint8Array | string
	) : Promise<string | undefined> {
		if (typeof image === 'string' || image instanceof Uint8Array) {
			image = await this.fileService.toImageElement(image);
		}

		if (image instanceof HTMLImageElement) {
			return this.scanQRCodeInternal(
				this.fileService.getImageData(image)
			);
		}

		const video = image;

		return new Promise<string | undefined>(resolve => {
			const tryScanQRCode = async () => {
				const code = await this.scanQRCodeInternal(
					this.fileService.getImageData(video)
				);

				if (code) {
					resolve(code);
					return;
				}

				if (video.ended) {
					resolve(undefined);
					return;
				}

				requestAnimationFrame(tryScanQRCode);
			};

			requestAnimationFrame(tryScanQRCode);
		});
	}

	constructor (
		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
