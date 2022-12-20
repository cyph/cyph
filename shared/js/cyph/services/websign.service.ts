import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {
	IAGSEPKISigningRequest,
	IWebSignPackageData,
	IWebSignPackageSubresources,
	IWebSignPendingRelease,
	WebSignPackageData,
	WebSignPackageSubresources,
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
	private readonly algorithm =
		this.potassiumService.sign.currentAlgorithm.then(o => o.hardened);

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
		const algorithm = await this.algorithm;
		const keyPair = (await this.accountDatabaseService.getCurrentUser())
			.keyrings.private.signPrivateKeys?.[algorithm];

		if (keyPair === undefined) {
			throw new Error('Missing package signing key.');
		}

		const signature = await this.potassiumService.sign.signDetached(
			packageData.payload,
			keyPair.privateKey,
			`${this.accountDatabaseService.namespace}:webSign/signatures/${packageData.packageName}`
		);

		return {
			algorithm,
			data: await this.potassiumService.sign.sign(
				await serialize<IWebSignPackageData>(WebSignPackageData, {
					...packageData,
					algorithm,
					signature
				}),
				keyPair.privateKey,
				`${this.accountDatabaseService.namespace}:webSign/signingRequests/${packageData.packageName}`
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
		const algorithm = await this.algorithm;

		if (signingRequest.algorithm !== algorithm) {
			throw new Error('Invalid algorithm in signing request.');
		}

		const authorPublicKey = (
			await this.accountDatabaseService.getUserPublicKeys(author)
		).signPublicKeys?.[algorithm];

		if (authorPublicKey === undefined) {
			throw new Error(`Missing package signing key for @${author}.`);
		}

		const packageData = await deserialize(
			WebSignPackageData,
			await this.potassiumService.sign.open(
				signingRequest.data,
				authorPublicKey,
				`${this.accountDatabaseService.namespace}:webSign/signingRequests/${packageName}`
			)
		);

		if (
			packageData.algorithm !== algorithm ||
			packageData.packageName !== packageName
		) {
			throw new Error('Invalid package data.');
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
	public async submitRelease (
		packageData: IWebSignPackageData,
		subresources: IWebSignPackageSubresources = {}
	) : Promise<void> {
		packageData.timestamp = await getTimestamp();

		await this.accountDatabaseService.callFunction('webSignSubmitRelease', {
			packageName: packageData.packageName,
			requiredUserSignatures: packageData.requiredUserSignatures,
			signingRequest: await this.generateSigningRequest(packageData),
			subresourcesData: await serialize<IWebSignPackageSubresources>(
				WebSignPackageSubresources,
				subresources
			),
			timestamp: packageData.timestamp
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
