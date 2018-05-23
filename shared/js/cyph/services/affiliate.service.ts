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
			protect: translate('Protect your browsing online with NordVPN'),
			recommended: translate("Get Cyph's recommended VPN service — NordVPN")
		},
		links: {
			default: 'https://go.nordvpn.net/SH1F4',
			doublevpn: 'https://go.nordvpn.net/SH1FK',
			threeyear: 'https://go.nordvpn.net/SH1F8'
		}
	};

		/** @ignore */
		private readonly amazon	= {
			copy: {
				webcam4k: translate('Recommended 4k Webcam')
			},
			links: {
				webcam4k: 'https://amzn.to/2KOInzc'
			}
		};

	/** VPN affiliate link and ad copy. */
	public readonly link	= this.splitTestingService.getValue('affiliatelink', [
		{href: this.nordVPN.links.doublevpn, text: this.nordVPN.copy.doublevpn},
		{href: this.nordVPN.links.threeyear, text: this.nordVPN.copy.recommended},
		{href: this.nordVPN.links.default, text: this.nordVPN.copy.protect},
		{href: this.amazon.links.webcam4k, text: this.amazon.copy.webcam4k}
	]);

	constructor (
		/** @ignore */
		private readonly splitTestingService: SplitTestingService
	) {}
}
