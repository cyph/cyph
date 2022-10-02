/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {Dexie} from 'dexie';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {skip} from 'rxjs/operators';
import {superSphincs} from 'supersphincs';
import {agsePublicSigningKeys} from '../../account/agse-public-signing-keys';
import {BaseProvider} from '../../base-provider';
import {MaybePromise} from '../../maybe-promise-type';
import {
	AGSEPKICertified,
	IWebSignPackageContainer,
	IWebSignPackage,
	PotassiumData,
	WebSignKeyPersistence,
	WebSignPackageContainer,
	WebSignPackage
} from '../../proto';
import {toInt} from '../../util/formatting';
import {getOrSetDefaultAsync} from '../../util/get-or-set-default';
import {debugLogError} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {request, requestBytes, requestProto} from '../../util/request';
import {deserialize, serialize} from '../../util/serialization/proto';
import {watchDateChange} from '../../util/time';
import {reloadWindow} from '../../util/window';
import {EnvService} from '../env.service';
import {WindowWatcherService} from '../window-watcher.service';
import {PotassiumService} from './potassium.service';

/**
 * Angular service for managing the local WebSign instance.
 */
@Injectable()
export class WebSignClientService extends BaseProvider {
	/** Copy of required WebSign config.js values. */
	private readonly config = {
		additionalDataPackagePrefix: 'cyph.ws:webSign/packages/',
		additionalDataSignaturePrefix: 'cyph.ws:webSign/signatures/',
		algorithm: PotassiumData.SignAlgorithms.V2Hardened
	};

	/** WebSign Brotli decoder instance. */
	private readonly brotliDecode:
		| ((compressed: Uint8Array) => Uint8Array)
		| undefined = (<any> self).BrotliDecode;

	/** Timestamp of most recently cached package. */
	private cachedPackageTimestamp: number | undefined;

	/** Native ipfs-fetch instance (where available). */
	private readonly nativeIPFSFetch:
		| ((
				ipfsHash: string,
				options?: {timeout?: number}
		  ) => Promise<Uint8Array>)
		| undefined =
		typeof cordovaRequire === 'function' ?
			(() => {
				try {
					return cordovaRequire('ipfs-fetch');
				}
				catch {}
			})() :
		typeof cordovaNodeJS !== 'undefined' ?
			async (ipfsHash, options) =>
				this.potassiumService.fromBase64(
					(await cordovaNodeJS).ipfsFetch(ipfsHash, options)
				) :
			undefined;

	/** Map of timestamps to package data objects. */
	private readonly packageCache = new Map<
		number,
		{
			packageContainer: IWebSignPackageContainer;
			webSignPackage: IWebSignPackage;
		}
	>();

	/** Public signing keys. */
	private readonly publicSigningKeys = agsePublicSigningKeys.prod.get(
		this.config.algorithm
	) ?? {classical: [], postQuantum: []};

	/** WebSign client local storage. */
	private readonly storage = (() => {
		const dexie = new Dexie('WebSign');
		dexie.version(1).stores({data: 'key'});
		return dexie.table('data');
	})();

	/** Indicates whether automatic updates should be applied. */
	public readonly autoUpdateEnable = new BehaviorSubject<boolean>(true);

	/** Timeout before automatic update is applied. */
	public readonly autoUpdateTimeout = 300_000;

	/** Currently loaded package name. */
	public readonly packageName: string | undefined = (() => {
		try {
			return (
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				localStorage.getItem('webSignPackageName') ||
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				(localStorage.getItem('webSignCdnUrl') || '')
					.split('/')
					.slice(-2)[0]
			);
		}
		catch {
			return undefined;
		}
	})();

	/** Currently loaded package timestamp. */
	public readonly packageTimestamp: number | undefined = (() => {
		try {
			const timestamp = toInt(
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				localStorage.getItem('webSignPackageTimestamp')
			);

			if (isNaN(timestamp)) {
				throw new Error('Invalid timestamp.');
			}

			return timestamp;
		}
		catch {
			return undefined;
		}
	})();

	/** Watches for package updates to keep long-running background instances in sync. */
	public readonly watchPackageUpdates = memoize(
		(confirmHandler: () => MaybePromise<boolean> = () => true) : void => {
			const packageTimestamp = this.packageTimestamp;

			if (
				!this.packageName ||
				packageTimestamp === undefined ||
				this.envService.isLocalEnv
			) {
				return;
			}

			this.subscriptions.push(
				/* TODO: Initiate event from server side */
				observableAll([
					this.windowWatcherService.visibility.pipe(skip(1)),
					watchDateChange(true)
				]).subscribe(async ([visible]) => {
					if (!this.autoUpdateEnable.value) {
						return;
					}

					try {
						const {
							webSignPackage: {
								packageData: {mandatoryUpdate, timestamp}
							}
						} = await this.cachePackage();

						if (packageTimestamp >= timestamp) {
							return;
						}

						if (
							(!visible && mandatoryUpdate) ||
							(visible && (await confirmHandler()))
						) {
							reloadWindow();
						}
					}
					catch (err) {
						debugLogError(() => ({
							webSignWatchPackageUpdatesError: err
						}));
					}
				})
			);
		}
	);

	/** @ignore */
	private async getLatestPackage (
		packageName: string,
		packageTimestamp?: number
	) : Promise<{
		packageContainer: IWebSignPackageContainer;
		webSignPackage: IWebSignPackage;
	}> {
		const brotliDecode = this.brotliDecode;
		if (brotliDecode === undefined) {
			throw new Error('Missing Brotli decoder.');
		}

		const packageContainer = await requestProto(WebSignPackageContainer, {
			url: `${this.envService.baseUrl}websign/package/${packageName}`
		});

		if (
			typeof packageTimestamp === 'number' &&
			packageTimestamp > packageContainer.timestamp
		) {
			throw new Error(
				`Outdated package timestamp (${packageTimestamp.toString()} > ${packageContainer.timestamp.toString()}).`
			);
		}

		const certifiedMessage = await deserialize(
			AGSEPKICertified,
			brotliDecode(packageContainer.data)
		);

		if (certifiedMessage.algorithm !== this.config.algorithm) {
			throw new Error('Invalid signing algorithm.');
		}

		const publicKeys = {
			classical:
				this.publicSigningKeys.classical[
					certifiedMessage.publicKeys.classical
				],
			postQuantum:
				this.publicSigningKeys.postQuantum[
					certifiedMessage.publicKeys.postQuantum
				]
		};

		if (!publicKeys.classical || !publicKeys.postQuantum) {
			throw new Error('No valid public key specified.');
		}

		const {publicKey} = await superSphincs.importKeys({
			public: publicKeys
		});

		const webSignPackage = await deserialize(
			WebSignPackage,
			await superSphincs.open(
				certifiedMessage.data,
				publicKey,
				this.config.additionalDataPackagePrefix + packageName
			)
		);

		if (
			webSignPackage.packageData.timestamp !== packageContainer.timestamp
		) {
			throw new Error('Package timestamp mismatch.');
		}

		let webSignKeyPersistenceTOFU =
			webSignPackage.packageData.keyPersistence ===
			WebSignKeyPersistence.TOFU;

		if (webSignKeyPersistenceTOFU) {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignKeyPersistenceTOFU',
				webSignKeyPersistenceTOFU.toString()
			);
		}
		else {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			webSignKeyPersistenceTOFU =
				localStorage.getItem('webSignKeyPersistenceTOFU') === 'true';
		}

		await Promise.all(
			webSignPackage.signatures.map(async packageSignature => {
				let publicKey = packageSignature.publicKey;

				if (webSignKeyPersistenceTOFU) {
					const publicKeyStorageKey = `webSignPublicKey_${packageSignature.username}`;

					const pinnedPublicKey =
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						this.potassiumService.fromBase64(
							localStorage.getItem(publicKeyStorageKey) ?? ''
						);

					if (pinnedPublicKey.length > 0) {
						publicKey = pinnedPublicKey;
					}
					else {
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						localStorage.setItem(
							publicKeyStorageKey,
							this.potassiumService.toBase64(publicKey)
						);
					}
				}

				const secondarySignatureIsValid =
					await superSphincs.verifyDetached(
						packageSignature.signature,
						webSignPackage.packageData.payload,
						publicKey,
						this.config.additionalDataSignaturePrefix + packageName
					);

				if (!secondarySignatureIsValid) {
					throw new Error(
						`Invalid secondary signature: @${packageSignature.username}`
					);
				}
			})
		);

		return {
			packageContainer,
			webSignPackage
		};
	}

	/** Fetches data from IPFS. */
	private async ipfsFetch (
		ipfsHash: string,
		timeout: number,
		gateways: string[]
	) : Promise<Uint8Array> {
		let lastError: any;

		try {
			if (this.nativeIPFSFetch !== undefined) {
				return await this.nativeIPFSFetch(ipfsHash, {timeout});
			}
		}
		catch (err) {
			lastError = err;
		}

		for (const gateway of ['ipfs://:hash', ...gateways]) {
			try {
				return await requestBytes({
					timeout,
					url: gateway.replace(':hash', ipfsHash)
				});
			}
			catch (err) {
				lastError = err;
			}
		}

		throw lastError;
	}

	/** Caches latest package data in local storage to optimize the next startup. */
	public async cachePackage (minTimestamp?: number) : Promise<{
		packageContainer: IWebSignPackageContainer;
		webSignPackage: IWebSignPackage;
	}> {
		const latestPackage = await this.getPackage({minTimestamp});

		const {
			webSignPackage: {
				hashWhitelist = {},
				packageData: {expirationTimestamp = 0}
			},
			packageContainer
		} = latestPackage;

		const {gateways, subresources, subresourceTimeouts} = packageContainer;

		if (
			gateways === undefined ||
			subresources === undefined ||
			subresourceTimeouts === undefined ||
			packageContainer.timestamp === undefined ||
			(this.cachedPackageTimestamp !== undefined &&
				this.cachedPackageTimestamp >= packageContainer.timestamp)
		) {
			return latestPackage;
		}

		try {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignExpires',
				expirationTimestamp.toString()
			);
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignHashWhitelist',
				JSON.stringify(hashWhitelist)
			);
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignPackageContainer',
				this.potassiumService.toBase64(
					await serialize(WebSignPackageContainer, packageContainer)
				)
			);
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignPackageTimestamp',
				packageContainer.timestamp.toString()
			);
		}
		catch {}

		const brotliDecode = this.brotliDecode;
		if (brotliDecode === undefined) {
			return latestPackage;
		}

		await this.storage.bulkPut(
			await Promise.all(
				Object.entries(subresources).map(
					async ([subresource, ipfsHash]) => {
						const content = this.potassiumService.toString(
							brotliDecode(
								await this.ipfsFetch(
									ipfsHash,
									subresourceTimeouts[subresource],
									gateways
								)
							)
						);

						const hash = this.potassiumService.toBase64(
							await this.potassiumService.hash.hash(content)
						);

						return {
							key: `websign-sri-cache/${hash}`,
							value: content
						};
					}
				)
			)
		);

		this.cachedPackageTimestamp = packageContainer.timestamp;

		return latestPackage;
	}

	/** Gets latest package data. */
	public async getPackage ({
		forceLatest = false,
		minTimestamp,
		packageName = this.packageName
	}: {
		forceLatest?: boolean;
		minTimestamp?: number;
		packageName?: string;
	} = {}) : Promise<{
		packageContainer: IWebSignPackageContainer;
		webSignPackage: IWebSignPackage;
	}> {
		if (packageName === undefined) {
			throw new Error('Invalid current package name.');
		}

		if (forceLatest) {
			return this.getLatestPackage(packageName);
		}

		const packageTimestamp = await this.getPackageTimestamp();

		if (
			isNaN(packageTimestamp) ||
			(minTimestamp !== undefined && minTimestamp > packageTimestamp)
		) {
			throw new Error('Invalid package timestamp.');
		}

		return getOrSetDefaultAsync(
			this.packageCache,
			packageTimestamp,
			async () => this.getLatestPackage(packageName, packageTimestamp)
		);
	}

	/** Gets latest package timestamp. */
	public async getPackageTimestamp () : Promise<number> {
		if (this.packageName === undefined) {
			throw new Error('Invalid current package name.');
		}
		if (this.packageTimestamp === undefined) {
			throw new Error('Invalid current package timestamp.');
		}

		const latestPackageTimestamp = toInt(
			await request({
				url: `${this.envService.baseUrl}packagetimestamp/${this.packageName}`
			})
		);

		if (
			isNaN(latestPackageTimestamp) ||
			this.packageTimestamp > latestPackageTimestamp
		) {
			throw new Error('Invalid latest package timestamp.');
		}

		return latestPackageTimestamp;
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();

		this.cachedPackageTimestamp = this.packageTimestamp;
	}
}
