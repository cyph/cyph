import {Inject, Injectable, Optional} from '@angular/core';
import * as countryList from 'country-list';
import {Env, env} from '../env';
import {geolocation} from '../geolocation';
import {DataURIProto, StringProto} from '../proto';
import {toInt} from '../util/formatting';
import {deserialize} from '../util/serialization';
import {LocalStorageService} from './local-storage.service';

/**
 * @see Env
 */
@Injectable()
export class EnvService extends Env {
	/** List of country options. */
	public readonly countries: Promise<{label: string; value: string}[]>;

	/** Custom build images. */
	public readonly customBuildImages = {
		audioImage:
			this.environment.customBuild &&
			this.environment.customBuild.audioImage ?
				deserialize(
					DataURIProto,
					this.environment.customBuild.audioImage
				) :
				undefined,
		errorImage:
			this.environment.customBuild &&
			this.environment.customBuild.errorImage ?
				deserialize(
					DataURIProto,
					this.environment.customBuild.errorImage
				) :
				undefined,
		favicon:
			this.environment.customBuild &&
			this.environment.customBuild.favicon ?
				deserialize(
					DataURIProto,
					this.environment.customBuild.favicon
				) :
				undefined,
		logoHorizontal:
			this.environment.customBuild &&
			this.environment.customBuild.logoHorizontal ?
				deserialize(
					DataURIProto,
					this.environment.customBuild.logoHorizontal
				) :
				undefined,
		logoVertical:
			this.environment.customBuild &&
			this.environment.customBuild.logoVertical ?
				deserialize(
					DataURIProto,
					this.environment.customBuild.logoVertical
				) :
				undefined
	};

	/** @see geolocation */
	public readonly geolocation = geolocation;

	/** Indicates whether this is the accounts UI. */
	public readonly isAccounts: boolean = false;

	/** Package/environment name. */
	public readonly packageName: Promise<string> = (async () => {
		try {
			if (this.localStorageService) {
				const timestamp = toInt(
					await this.localStorageService.getItem(
						'webSignPackageTimestamp',
						StringProto
					)
				);

				if (!isNaN(timestamp)) {
					return `${this.host} ${timestamp.toString()}`;
				}
			}
		}
		catch {}

		return this.host;
	})();

	/** @inheritDoc */
	public readonly pro = env.pro;

	/** @inheritDoc */
	public readonly telehealthTheme = env.telehealthTheme;

	/**
	 * Indicates whether the currently pinned version of WebSign has a known issue
	 * and the user should be advised to replace it.
	 */
	public readonly webSignError: Promise<boolean> = (async () => {
		const affectedWebSignHashes = [
			'c69d24ad20d6b0693fc37dd8c60f20f80be5b3251286a0ddbcb632e04fac0312' +
				'3c80d1319706bfdab1992e39f3cc5c6b93dbfc05d9dd30c03d2109cd7793453a',
			'351749074a823a34dd436c7bce0b9c5e3ff678f71c8d31868c7057c2dfd79625' +
				'31ce0d93d42bd1e765629bf20acc1482782e39ecf70fa91e76797607a6c613fc',
			'f33c04c1831c71fceb19d3d8071d9bb9d6cacd133312a5efe7ea354d8a95a497' +
				'381a57d3da3d56ac76432764eea368d1c13d0b97a1a30680363bf0511c6bbd54',
			'24e893c57959e5b463e8372f63b32bdea61c58e3a78e2c673dc900f01d77a6ae' +
				'478923f763ec69127b7ff4409071e43c29a470c9301db469c4ef521ba6bee5c0',
			'3cd6225226160d5a1c8f39193837a460c1cf58e94f6a28b75ac6d1ec8764226d' +
				'6093754fa21e826874b140c7071f3133533cd69b07f2107cc646c47a2742be3f',
			'ac3e65f02e2be2e84f8eb6acc16bb7c7f37967ae11374cf07d6262a2b56c79be' +
				'631fed426398934a18a00569d134c3a7fe9bf475d406887e27550a27469feadc',
			'69f97b88d00c6e1d4683fb7771b27291b7dbb998a58bba9127b6c79e7ea6044c' +
				'88482237e8ad0dd8dd6b34ad9edfd21cb0bcf0831a98cd86e774be40002be3b1',
			'fe3faada0741459ccaed88b622a795aa62aed79fbcb325a5ad6594d875611ba6' +
				'e35cad39dea62b7d13e0b5c655b802914d398895e197459b91cba28e02361df9'
		];

		try {
			if (this.localStorageService) {
				const isAffectedBrowser = /\/#test$/.test(
					new Request('https://cyph.app/#test').url
				);

				const webSignHash = await this.localStorageService.getItem(
					'webSignHash',
					StringProto
				);

				return (
					isAffectedBrowser &&
					affectedWebSignHashes.indexOf(webSignHash) > -1
				);
			}
		}
		catch {}

		return false;
	})();

	/** Version of newCyphUrl that triggers a retry. */
	public get newCyphUrlRetry () : string {
		return '/retry/' + this.newCyphBaseUrl.replace(/^.*?(\/#|$)/, '');
	}

	constructor (
		/** @ignore */
		@Inject(LocalStorageService)
		@Optional()
		private readonly localStorageService: LocalStorageService | undefined
	) {
		super();

		this.countries = this.geolocation.countryCode.then(countryCode => {
			if (!countryCode) {
				countryCode = 'us';
			}

			const countries = countryList.getData().map(o => ({
				label: o.name,
				value: o.code
			}));

			return countries.sort((a, b) =>
				a.value.toLowerCase() === countryCode ?
					-1 :
					a.label.localeCompare(b.label)
			);
		});
	}
}
