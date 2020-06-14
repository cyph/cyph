import {Injectable} from '@angular/core';
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {InAppPurchaseComponent} from '../components/in-app-purchase';
import {MaybePromise} from '../maybe-promise-type';
import {BooleanProto} from '../proto';
import {observableAll} from '../util/observable-all';
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
	/** @ignore */
	private readonly canOpenMobileApp =
		!this.envService.isCordova &&
		(this.envService.isAndroid || this.envService.isIOS) &&
		this.envService.appUrl === 'https://cyph.app/';

	/** Controls whether upsell banner is enabled. */
	public readonly mobileAppBanner = new ReplaySubject<boolean>();

	/** Controls whether /register upsell banner is enabled. */
	public readonly registerUpsellBanner = new BehaviorSubject<boolean>(
		!this.envService.isTelehealth
	);

	/** Controls whether upsell banner is enabled. */
	public readonly upsellBanner = new ReplaySubject<boolean>();

	/** Closes mobile app banner. */
	public async dismissMobileAppBanner () : Promise<void> {
		this.mobileAppBanner.next(false);

		await this.localStorageService.setItem(
			'disableMobileAppBanner',
			BooleanProto,
			true
		);
	}

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

	/** Redirects to mobile app. */
	public openMobileApp () : void {
		if (!this.canOpenMobileApp) {
			return;
		}

		location.href = `https://cyph.page.link/?apn=com.cyph.app&ibi=com.cyph.app&isi=1422086509&link=${location.toString()}`;
	}

	/** Opens pricing/upgrade page, with workarounds for platform-specific restrictions. */
	public async openPricing (
		url: string | MaybePromise<string | undefined>[],
		sameWindow: boolean | undefined,
		inAppPurchase: InAppPurchaseComponent | undefined
	) : Promise<void> {
		if (
			inAppPurchase?.checkoutComponent &&
			this.envService.inAppPurchasesSupported
		) {
			await inAppPurchase.checkoutComponent.submit();

			const inviteCode =
				inAppPurchase.checkoutComponent.confirmationMessage.value
					?.welcomeLetter;

			if (inviteCode && inAppPurchase.inviteCodeFormControl) {
				inAppPurchase.inviteCodeFormControl.setValue(inviteCode);
			}

			return;
		}

		if (!this.envService.noInAppPurchasesAllowed) {
			if (url) {
				await openWindow(url, sameWindow);
			}

			return;
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

		if (this.canOpenMobileApp) {
			this.subscriptions.push(
				this.localStorageService
					.watch(
						'disableMobileAppBanner',
						BooleanProto,
						this.subscriptions
					)
					.subscribe(disableMobileAppBanner => {
						this.mobileAppBanner.next(
							!disableMobileAppBanner.value
						);
					})
			);
		}
		else {
			this.mobileAppBanner.next(false);
		}

		this.subscriptions.push(
			observableAll([
				this.localStorageService.watch(
					'disableUpsellBanner',
					BooleanProto,
					this.subscriptions
				),
				this.accountSettingsService.plan
			]).subscribe(([disableUpsellBanner, plan]) => {
				const upsellBanner =
					!disableUpsellBanner.value &&
					!this.envService.isTelehealth &&
					!this.configService.planConfig[plan].lifetime &&
					!this.configService.planConfig[plan].telehealth &&
					!this.envService.noInAppPurchasesReferenceAllowed;

				this.upsellBanner.next(upsellBanner);
			})
		);
	}
}
