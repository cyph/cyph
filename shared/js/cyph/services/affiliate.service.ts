import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {translate} from '../util/translate';
import {EnvService} from './env.service';
import {SplitTestingService} from './split-testing.service';
import {StringsService} from './strings.service';


/** URLs and copy for affiliate programs. */
@Injectable()
export class AffiliateService extends BaseProvider {
	/** @ignore */
	private readonly lifeLock	= {
		banners: {
			databreach: {
				href: 'https://www.kqzyfj.com/q3122wktqks7GHDCGGF79B8F8DFE',
				img: 'assets/img/banners/lifelock.breach.jpg'
			},
			mobile: {
				android: {
					href: '',
					img: ''
				},
				ios: {
					href: '',
					img: ''
				}
			}
		}
	};

	/** @ignore */
	private readonly nordVPN	= {
		banners: {
			animated: {
				href: 'https://go.nordvpn.net/SH1F4',
				img: 'assets/img/banners/nord.animated.gif'
			},
			mobile: {
				android: {
					href: 'https://go.nordvpn.net/SH1in',
					img: 'assets/img/banners/nord.android.small.jpg'
				},
				ios: {
					href: 'https://go.nordvpn.net/SH1il',
					img: 'assets/img/banners/nord.ios.small.jpg'
				}
			}
		},
		copy: {
			doublevpn: translate('Double VPN Encryption'),
			protect: translate('Protect your browsing online with NordVPN'),
			recommended: translate("Get Cyph's recommended VPN service — NordVPN")
		},
		links: {
			default: 'https://go.nordvpn.net/SH1F4',
			doublevpn: 'https://go.nordvpn.net/SH1FK',
			threeyear: 'https://go.nordvpn.net/SH1F8'
		}
	};

	/** Banner ad for desktop. */
	public readonly bannerAd		= this.splitTestingService.getValue('bannerAd', [
		{
			href: this.lifeLock.banners.databreach.href,
			img: this.lifeLock.banners.databreach.img
		},
		{
			href: this.nordVPN.banners.animated.href,
			img: this.nordVPN.banners.animated.img
		}
	]);

	/** Banner ad for Android. */
	public readonly bannerAdAndroid	= this.splitTestingService.getValue('bannerAdAndroid', [
		/*
		{
			href: this.lifeLock.banners.mobile.android.href,
			img: this.lifeLock.banners.mobile.android.img
		},
		*/
		{
			href: this.nordVPN.banners.mobile.android.href,
			img: this.nordVPN.banners.mobile.android.img
		}
	]);

	/** Banner ad for iOS. */
	public readonly bannerAdIOS		= this.splitTestingService.getValue('bannerAdIOS', [
		/*
		{
			href: this.lifeLock.banners.mobile.ios.href,
			img: this.lifeLock.banners.mobile.ios.img
		},
		*/
		{
			href: this.nordVPN.banners.mobile.ios.href,
			img: this.nordVPN.banners.mobile.ios.img
		}
	]);

	/** Checkout offer. */
	public readonly checkout		=
		{href: this.nordVPN.links.default, text: this.nordVPN.copy.recommended}
	;

	/** Affiliate link and ad copy. */
	public readonly link			= this.splitTestingService.getValue('affiliatelink', [
		{href: this.nordVPN.links.doublevpn, text: this.nordVPN.copy.doublevpn},
		{href: this.nordVPN.links.threeyear, text: this.nordVPN.copy.recommended},
		{href: this.nordVPN.links.default, text: this.nordVPN.copy.protect},
		{href: this.envService.homeUrl + 'donate', text: this.stringsService.bannerTextAlt}
	]);

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly splitTestingService: SplitTestingService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
