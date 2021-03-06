import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {StringsService} from './strings.service';

/**
 * Angular service for fingerprint authentication.
 */
@Injectable()
export class FingerprintService extends BaseProvider {
	/** Indicates whether fingerprint auth is supported. */
	public readonly supported = new Promise<boolean>(resolve => {
		(<any> self).Fingerprint.isAvailable(
			() => {
				resolve(true);
			},
			() => {
				resolve(false);
			}
		);
	}).catch(() => false);

	/** Perform fingerprint authentication. */
	public async authenticate () : Promise<boolean> {
		return new Promise<any>(resolve => {
			(<any> self).Fingerprint.show(
				{
					clientId: this.stringsService.product,
					clientSecret:
						this.stringsService.product +
						'7tR2xeQHcy33DDSRs+wJMYMmKQVa/NEfOrVAD8CqXIo='
				},
				() => {
					resolve(true);
				},
				() => {
					resolve(false);
				}
			);
		}).catch(() => false);
	}

	constructor (
		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
