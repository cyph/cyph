import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {debugLogError} from '../../util/log';
import {WorkerService} from '../worker.service';

/**
 * Angular service for PGP.
 */
@Injectable()
export class PGPService extends BaseProvider {
	/** Proxy for OpenPGP library inside a worker. */
	private readonly openpgp = memoize(async () =>
		this.workerService
			.createThread<any>(
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts(
						'/assets/node_modules/openpgp/dist/openpgp.min.js'
					);

					const openpgp = (<any> self).openpgp;

					(<any> self).Comlink.expose(
						{
							readArmored: async (publicKey: string) => {
								const o = await openpgp.key.readArmored(
									publicKey
								);

								const userID =
									(o.keys[0].users[0] || {}).userId || {};

								return {
									comment: userID.comment,
									email: userID.email,
									fingerprint: o.keys[0].getFingerprint(),
									keyID: o.keys[0].getKeyId().toHex(),
									name: userID.name,
									userID: userID.userid
								};
							}
						},
						self
					);
				}
			)
			.then(async thread => thread.api)
	);

	/** Gets relevant metadata from PGP public key. */
	public readonly getPublicKeyMetadata = memoize(
		async (publicKey: string) => {
			let comment: string | undefined;
			let email: string | undefined;
			let fingerprint: string | undefined;
			let keyID: string | undefined;
			let name: string | undefined;
			let userID: string | undefined;

			try {
				const o = await (await this.openpgp()).readArmored(publicKey);

				comment = o.comment;
				email = o.email;
				fingerprint = this.formatHex(o.fingerprint);
				keyID = this.formatHex(o.keyID);
				name = o.name;
				userID = o.userID;
			}
			catch (err) {
				debugLogError(() => ({getPublicKeyMetadataError: err}));
			}

			return {
				comment,
				email,
				fingerprint,
				keyID,
				name,
				publicKey,
				userID
			};
		}
	);

	/** @ignore */
	private formatHex (hex: string | ArrayBufferView) : string {
		return (
			potassiumUtil
				.toHex(hex)
				.toUpperCase()
				.match(/(.{4}|.+$)/g) || []
		).join(' ');
	}

	constructor (
		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
