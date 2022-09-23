import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {
	IAGSEPKISigningRequest,
	IWebSignPackageData,
	IWebSignPendingRelease,
	PotassiumData,
	WebSignPackageData,
	WebSignPendingRelease
} from '../../proto';
import {deserialize, serialize} from '../util/serialization/proto';
import {getTimestamp} from '../util/time';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';

/**
 * Angular service for using the WebSign platform.
 */
@Injectable()
export class WebSignService extends BaseProvider {
	/** Signing algorithm. */
	private readonly algorithm = PotassiumData.SignAlgorithms.NativeV2Hardened;

	/** List of pending releases to be signed by the current user. */
	public readonly pendingReleases = memoize(() =>
		this.accountDatabaseService.watchList(
			'webSign/pendingReleases',
			WebSignPendingRelease,
			SecurityModels.unprotected,
			undefined,
			undefined,
			undefined,
			this.subscriptions
		)
	);

	/** @ignore */
	private async generateSigningRequest (
		packageData: IWebSignPackageData
	) : Promise<IAGSEPKISigningRequest> {
		const keyPair = (await this.accountDatabaseService.getCurrentUser())
			.keyrings.private.signPrivateKeys?.[this.algorithm];

		if (keyPair === undefined) {
			throw new Error('Missing package signing key.');
		}

		const signature = await this.potassiumService.sign.signDetached(
			packageData.payload,
			keyPair.privateKey,
			packageData.packageName
		);

		return {
			algorithm: this.algorithm,
			data: await this.potassiumService.sign.sign(
				await serialize<IWebSignPackageData>(WebSignPackageData, {
					...packageData,
					algorithm: this.algorithm,
					signature
				}),
				keyPair.privateKey,
				packageData.packageName
			)
		};
	}

	/**
	 * Adds signature to a pending release.
	 *
	 * In the event that no remaining signatures are required, the release will be
	 * deployed to the live environment.
	 */
	public async signPendingRelease ({
		author,
		packageName,
		releaseID,
		signingRequest
	}: IWebSignPendingRelease) : Promise<void> {
		if (signingRequest.algorithm !== this.algorithm) {
			throw new Error('Invalid algorithm in signing request.');
		}

		const authorPublicKey = (
			await this.accountDatabaseService.getUserPublicKeys(author)
		).signPublicKeys?.[this.algorithm];

		if (authorPublicKey === undefined) {
			throw new Error(`Missing package signing key for @${author}.`);
		}

		const packageData = await deserialize(
			WebSignPackageData,
			await this.potassiumService.sign.open(
				signingRequest.data,
				authorPublicKey,
				packageName
			)
		);

		if (packageData.algorithm !== this.algorithm) {
			throw new Error('Invalid algorithm in package data.');
		}

		await this.accountDatabaseService.callFunction(
			'webSignSignPendingRelease',
			{
				packageName,
				releaseID,
				signingRequest: await this.generateSigningRequest(packageData)
			}
		);
	}

	/**
	 * Signs and submits a new release.
	 *
	 * If requiredUserSignatures is specified, the release will be marked as
	 * pending and queued for deployment after all signatures are received.
	 * Otherwise, the release will be queued for immediate deployment.
	 */
	public async submitRelease ({
		expirationTimestamp,
		keyPersistence,
		packageName,
		payload,
		requiredUserSignatures = []
	}: IWebSignPackageData) : Promise<void> {
		const timestamp = await getTimestamp();

		await this.accountDatabaseService.callFunction('webSignSubmitRelease', {
			packageName,
			requiredUserSignatures,
			signingRequest: await this.generateSigningRequest({
				expirationTimestamp,
				keyPersistence,
				packageName,
				payload,
				requiredUserSignatures,
				timestamp
			}),
			timestamp
		});
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
