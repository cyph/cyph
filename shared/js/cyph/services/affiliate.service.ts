/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';


/**
 * URLs and copy for affiliate programs
 */
@Injectable()
export class AffiliateService {
	/** NordVPN Affiliate Links & Ad Copy */
	public readonly nordVPN			= {
		copy: {
			doublevpn: 'Double VPN Encryption',
			recommended: "Get Cyph's recommended VPN service - NordVPN"
		},
		links: {
			doublevpn: 'https://go.nordvpn.net/SH1FK',
			threeyear: 'https://go.nordvpn.net/SH1F8'
		}
	};
	constructor () {}
}
