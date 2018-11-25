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
	private readonly nordVPN	= {
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

	/** Checkout offer. */
	public readonly checkout	=
		{href: this.nordVPN.links.default, text: this.nordVPN.copy.recommended}
	;

	/** Affiliate link and ad copy. */
	public readonly link		= this.splitTestingService.getValue('affiliatelink', [
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
