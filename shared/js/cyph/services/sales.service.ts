import {Injectable} from '@angular/core';
import {BehaviorSubject, ReplaySubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {IInAppPurchaseComponent} from '../checkout/iin-app-purchase.component';
import {MaybePromise} from '../maybe-promise-type';
import {BooleanProto} from '../proto';
import {observableAll} from '../util/observable-all';
import {request} from '../util/request';
import {resolvable} from '../util/wait/resolvable';
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
	/** @see AccountService.accountBillingStatus */
	private readonly accountBillingStatus =
		resolvable<
			BehaviorSubject<{
				admin: boolean;
				goodStanding: boolean;
				stripe: boolean;
			}>
		>();

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

	/** @see AccountService.accountBillingStatus */
	public readonly setAccountBillingStatus = this.accountBillingStatus.resolve;

	/** Indicates whether upselling is allowed. */
	public readonly upsellAllowed = new ReplaySubject<boolean>();

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

	/** Redirects to billing portal. */
	public async openBillingPortal (
		userToken: MaybePromise<string | undefined>
	) : Promise<void> {
		userToken = await userToken;

		const url = userToken ?
			await request({
				data: {
					userToken
				},
				method: 'POST',
				url: this.envService.baseUrl + 'stripe/billingportal'
			}).catch(() => undefined) :
			undefined;

		await openWindow(
			url || `${this.envService.homeUrl}billing-portal`,
			!this.envService.isCordova
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
		inAppPurchase: IInAppPurchaseComponent | undefined
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

		(async () => {
			this.subscriptions.push(
				observableAll([
					await this.accountBillingStatus,
					this.accountSettingsService.plan
				]).subscribe(([accountBillingStatus, plan]) => {
					this.upsellAllowed.next(
						accountBillingStatus.admin &&
							!this.envService.isTelehealth &&
							this.configService.planConfig[plan].upsell &&
							!this.envService.noInAppPurchasesReferenceAllowed
					);
				})
			);

			this.subscriptions.push(
				observableAll([
					this.localStorageService.watch(
						'disableUpsellBanner',
						BooleanProto,
						this.subscriptions
					),
					this.upsellAllowed
				]).subscribe(([disableUpsellBanner, upsellAllowed]) => {
					this.upsellBanner.next(
						!disableUpsellBanner.value && upsellAllowed
					);
				})
			);
		})();
	}
}
