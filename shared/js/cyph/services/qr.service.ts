import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {DopeQrOptions, generateQRCode} from 'dope-qr';
import memoize from 'lodash-es/memoize';
import {encode} from 'msgpack-lite';
import {BaseProvider} from '../base-provider';
import {BinaryProto, DataURIProto} from '../proto';
import {PotassiumService} from './crypto/potassium.service';
import {LocalStorageService} from './local-storage.service';


/**
 * Angular service for QR codes.
 */
@Injectable()
export class QRService extends BaseProvider {
	/** Generates a QR code and caches to local storage. */
	public readonly getQRCode	= memoize(async (options: DopeQrOptions) : Promise<SafeUrl> =>
		DataURIProto.decode(
			await this.localStorageService.getOrSetDefault(
				`QRService/${this.potassiumService.toHex(
					await this.potassiumService.hash.hash(encode(options))
				)}`,
				BinaryProto,
				async () => generateQRCode(options)
			),
			'image/png'
		)
	);

	constructor (
		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
