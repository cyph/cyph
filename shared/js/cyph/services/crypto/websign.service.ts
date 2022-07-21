/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {Dexie} from 'dexie';
import {BehaviorSubject} from 'rxjs';
import {filter, skip} from 'rxjs/operators';
import {superSphincs as superSphincsLegacy} from 'supersphincs-legacy';
import {agsePublicSigningKeys} from '../../account/agse-public-signing-keys';
import {BaseProvider} from '../../base-provider';
import {MaybePromise} from '../../maybe-promise-type';
import {PotassiumData} from '../../proto';
import {toInt} from '../../util/formatting';
import {debugLogError} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {request, requestBytes, requestJSON} from '../../util/request';
import {watchDateChange} from '../../util/time';
import {reloadWindow} from '../../util/window';
import {EnvService} from '../env.service';
import {WindowWatcherService} from '../window-watcher.service';
import {PotassiumService} from './potassium.service';

/**
 * Angular service for WebSign.
 */
@Injectable()
export class WebSignService extends BaseProvider {
	/** WebSign Brotli decoder instance. */
	private readonly brotliDecode:
		| ((compressed: Uint8Array) => Uint8Array)
		| undefined = (<any> self).BrotliDecode;

	/** Native ipfs-fetch instance (where available). */
	private readonly nativeIPFSFetch:
		| ((
				ipfsHash: string,
				options?: {timeout?: number}
		  ) => Promise<Uint8Array>)
		| undefined =
		typeof cordovaRequire === 'function' ?
			cordovaRequire('ipfs-fetch') :
		typeof cordovaNodeJS !== 'undefined' ?
			async (ipfsHash, options) =>
				this.potassiumService.fromBase64(
					(await cordovaNodeJS).ipfsFetch(ipfsHash, options)
				) :
			undefined;

	/** Public signing keys. */
	private readonly publicSigningKeys = agsePublicSigningKeys.prod.get(
		PotassiumData.SignAlgorithms.V1
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

		for (const gateway of gateways) {
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
		expirationTimestamp: number;
		gateways: string[];
		hashWhitelist: Record<string, true>;
		html: string;
		mandatoryUpdate: boolean;
		subresources: Record<string, string>;
		subresourceTimeouts: Record<string, number>;
		timestamp: number;
	}> {
		const latestPackage = await this.getPackage(minTimestamp);

		const {
			expirationTimestamp,
			gateways,
			hashWhitelist,
			html,
			subresources,
			subresourceTimeouts,
			timestamp
		} = latestPackage;

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
				'webSignPackageMetadata',
				JSON.stringify({
					gateways,
					package: {
						root: html,
						subresources,
						subresourceTimeouts
					},
					timestamp
				})
			);
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				'webSignPackageTimestamp',
				timestamp.toString()
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

		return latestPackage;
	}

	/** Gets latest package data. */
	public async getPackage (minTimestamp?: number) : Promise<{
		expirationTimestamp: number;
		gateways: string[];
		hashWhitelist: Record<string, true>;
		html: string;
		mandatoryUpdate: boolean;
		subresources: Record<string, string>;
		subresourceTimeouts: Record<string, number>;
		timestamp: number;
	}> {
		if (this.packageName === undefined) {
			throw new Error('Invalid current package name.');
		}

		if (minTimestamp === undefined) {
			minTimestamp = await this.getPackageTimestamp();
		}

		const res = await requestJSON({
			url: `${this.envService.baseUrl}package/${this.packageName}`
		});

		if (
			typeof res !== 'object' ||
			!res ||
			typeof res.timestamp !== 'number' ||
			isNaN(res.timestamp) ||
			minTimestamp > res.timestamp ||
			typeof res.package !== 'object' ||
			!res.package ||
			typeof res.package.root !== 'string' ||
			!res.package.root ||
			typeof res.package.subresources !== 'object' ||
			!res.package.subresources ||
			typeof res.package.subresourceTimeouts !== 'object' ||
			!res.package.subresourceTimeouts
		) {
			throw new Error('Failed to fetch package data.');
		}

		const packageMetadata: {
			gateways: string[];
			package: {
				root: string;
				subresources: Record<string, string>;
				subresourceTimeouts: Record<string, number>;
			};
			timestamp: number;
		} = res;

		const packageLines = packageMetadata.package.root.trim().split('\n');

		const packageData = {
			publicKeys: {
				classical:
					this.publicSigningKeys.classical[toInt(packageLines[1])],
				postQuantum:
					this.publicSigningKeys.postQuantum[toInt(packageLines[2])]
			},
			signed: packageLines[0]
		};

		if (
			!packageData.publicKeys.classical ||
			!packageData.publicKeys.postQuantum
		) {
			throw new Error('No valid public key specified.');
		}

		const {publicKey} = await superSphincsLegacy.importKeys({
			public: packageData.publicKeys
		});

		const opened: {
			expires: number;
			hashWhitelist: Record<string, true>;
			mandatoryUpdate?: boolean;
			package: string;
			packageName: string;
			timestamp: number;
		} = JSON.parse(
			await superSphincsLegacy
				.openString(packageData.signed, publicKey)
				.catch(async () =>
					superSphincsLegacy.openString(
						packageData.signed,
						publicKey,
						new Uint8Array(0)
					)
				)
		);

		if (opened.packageName !== this.packageName) {
			throw new Error('Package name mismatch.');
		}
		if (opened.timestamp !== packageMetadata.timestamp) {
			throw new Error('Package timestamp mismatch.');
		}

		return {
			expirationTimestamp: opened.expires,
			gateways: packageMetadata.gateways,
			hashWhitelist: opened.hashWhitelist,
			html: opened.package,
			mandatoryUpdate: opened.mandatoryUpdate === true,
			subresources: packageMetadata.package.subresources,
			subresourceTimeouts: packageMetadata.package.subresourceTimeouts,
			timestamp: opened.timestamp
		};
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

	/** Watches for package updates to keep long-running background instances in sync. */
	public watchPackageUpdates (
		confirmHandler: () => MaybePromise<boolean> = () => true
	) : void {
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
				this.windowWatcherService.visibility.pipe(
					skip(1),
					filter(visible => visible)
				),
				watchDateChange()
			]).subscribe(async () => {
				if (!this.autoUpdateEnable.value) {
					return;
				}

				try {
					const {mandatoryUpdate, timestamp} =
						await this.cachePackage();

					if (packageTimestamp >= timestamp) {
						return;
					}

					if (mandatoryUpdate || (await confirmHandler())) {
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

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();
	}
}
