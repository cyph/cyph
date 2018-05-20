import {Injectable} from '@angular/core';
import {translate} from '../util/translate';


/**
 * URLs and copy for affiliate programs
 */
@Injectable()
export class AffiliateService {
	/** NordVPN affiliate links & ad copy. */
	public readonly nordVPN	= {
		copy: {
			doublevpn: translate('Double VPN Encryption'),
			recommended: translate("Get Cyph's recommended VPN service - NordVPN")
		},
		links: {
			doublevpn: 'https://go.nordvpn.net/SH1FK',
			threeyear: 'https://go.nordvpn.net/SH1F8'
		}
	};

	constructor () {}
}
