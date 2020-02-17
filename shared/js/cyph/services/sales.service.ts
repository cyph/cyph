import {Injectable} from '@angular/core';
import {BehaviorSubject, combineLatest, ReplaySubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {MaybePromise} from '../maybe-promise-type';
import {BooleanProto} from '../proto';
import {openWindow} from '../util/window';
import {AccountSettingsService} from './account-settings.service';
import {ConfigService} from './config.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {StringsService} from './strings.service';

/** Service for handling anything sales-related. */
@Injectable()
export class SalesService extends BaseProvider {
	/** Controls whether /register upsell banner is enabled. */
	public readonly registerUpsellBanner = new BehaviorSubject<boolean>(true);

	/** Controls whether upsell banner is enabled. */
	public readonly upsellBanner = new ReplaySubject<boolean>();

	/** Closes /register upsell banner. */
	public dismissRegisterUpsellBanner () : void {
		this.registerUpsellBanner.next(false);
	}

	/** Closes upsell banner. */
	public async dismissUpsellBanner () : Promise<void> {
		this.upsellBanner.next(false);

		await this.localStorageService.setItem(
			'disableUpsellBanner',
			BooleanProto,
			true
		);
	}

	/** Opens pricing/upgrade page, with workarounds for platform-specific restrictions. */
	public async openPricing (
		e?: Event,
		url?: string | MaybePromise<string | undefined>[],
		sameWindow?: boolean
	) : Promise<void> {
		if (!this.envService.isCordovaDesktopWindows) {
			if (url) {
				await openWindow(url, sameWindow);
			}

			return;
		}

		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		await this.dialogService.alert({
			content: this.stringsService.openPricingContent,
			title: this.stringsService.openPricingTitle
		});
	}

	constructor (
		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		this.subscriptions.push(
			combineLatest([
				this.localStorageService.watch(
					'disableUpsellBanner',
					BooleanProto,
					this.subscriptions
				),
				this.accountSettingsService.plan
			]).subscribe(([disableUpsellBanner, plan]) => {
				const upsellBanner =
					!disableUpsellBanner.value &&
					!this.configService.planConfig[plan].lifetime &&
					!this.configService.planConfig[plan].telehealth;

				this.upsellBanner.next(upsellBanner);
			})
		);
	}
}
