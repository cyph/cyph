import {Injectable} from '@angular/core';
import {translate} from '../util/translate';
import {SplitTestingService} from './split-testing.service';


/** URLs and copy for affiliate programs. */
@Injectable()
export class AffiliateService {
	/** @ignore */
	private readonly nordVPN	= {
		copy: {
			doublevpn: translate('Double VPN Encryption'),
			recommended: translate("Get Cyph's recommended VPN service — NordVPN"),
			protect: translate('Protect your browsing online with NordVPN')
		},
		links: {
			doublevpn: 'https://go.nordvpn.net/SH1FK',
			threeyear: 'https://go.nordvpn.net/SH1F8',
			default: 'https://go.nordvpn.net/SH1F4'
		}
	};

	/** VPN affiliate link and ad copy. */
	public readonly vpnLink	= this.splitTestingService.getValue('affiliatevpn', [
		{href: this.nordVPN.links.doublevpn, text: this.nordVPN.copy.doublevpn},
		{href: this.nordVPN.links.threeyear, text: this.nordVPN.copy.recommended},
		{href: this.nordVPN.links.default, text: this.nordVPN.copy.protect}
	]);

	constructor (
		/** @ignore */
		private readonly splitTestingService: SplitTestingService
	) {}
}
