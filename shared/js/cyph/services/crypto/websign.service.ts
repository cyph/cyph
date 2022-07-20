/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {filter, skip} from 'rxjs/operators';
import {superSphincs} from 'supersphincs';
import {publicSigningKeys} from '../../account/public-signing-keys';
import {BaseProvider} from '../../base-provider';
import {MaybePromise} from '../../maybe-promise-type';
import {toInt} from '../../util/formatting';
import {debugLogError} from '../../util/log';
import {request, requestJSON} from '../../util/request';
import {reloadWindow} from '../../util/window';
import {EnvService} from '../env.service';
import {WindowWatcherService} from '../window-watcher.service';

/**
 * Angular service for WebSign.
 */
@Injectable()
export class WebSignService extends BaseProvider {
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
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const timestamp = toInt(
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

	/** Gets latest package data. */
	public async getPackage (minTimestamp?: number) : Promise<{
		html: string;
		subresources: Record<string, string>;
		subresourceTimeouts: Record<string, number>;
		timestamp: number;
	}> {
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
			package: {
				root: string;
				subresources: Record<string, string>;
				subresourceTimeouts: Record<string, number>;
			};
			timestamp: number;
		} = res;

		const packageLines = packageMetadata.package.root.trim().split('\n');

		const packageData = {
			signed: packageLines[0],
			rsaKey: publicSigningKeys.prod.rsa[toInt(packageLines[1])],
			sphincsKey: publicSigningKeys.prod.sphincs[toInt(packageLines[2])]
		};

		if (!packageData.rsaKey || !packageData.sphincsKey) {
			throw new Error('No valid public key specified.');
		}

		const {publicKey} = await superSphincs.importKeys({
			public: {
				rsa: packageData.rsaKey,
				sphincs: packageData.sphincsKey
			}
		});

		const opened: {
			expires: number;
			hashWhitelist: Record<string, true>;
			package: string;
			packageName: string;
			timestamp: number;
		} = JSON.parse(
			await superSphincs
				.openString(packageData.signed, publicKey)
				.catch(async () =>
					superSphincs.openString(
						packageData.signed,
						publicKey,
						new Uint8Array(0)
					)
				)
		);

		if (packageMetadata.timestamp !== opened.timestamp) {
			throw new Error('Package timestamp mismatch.');
		}

		return {
			html: opened.package,
			subresources: packageMetadata.package.subresources,
			subresourceTimeouts: packageMetadata.package.subresourceTimeouts,
			timestamp: opened.timestamp
		};
	}

	/** Gets latest package timestamp. */
	public async getPackageTimestamp () : Promise<number> {
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
			this.windowWatcherService.visibility
				.pipe(
					skip(1),
					filter(visible => visible)
				)
				.subscribe(async () => {
					if (!this.autoUpdateEnable.value) {
						return;
					}

					try {
						const {timestamp} = await this.getPackage();

						if (
							timestamp > packageTimestamp &&
							(await confirmHandler())
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

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();
	}
}
