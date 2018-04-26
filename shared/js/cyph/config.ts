import {SubscriptionTypes} from './checkout';
import {ISessionService} from './service-interfaces/isession.service';


/**
 * Static/constant configuration values.
 */
export class Config {
	/** Configuration of available API flags. */
	public readonly apiFlags	= [
		{
			analEvent: 'modest-branding',
			character: '!',
			get: (sessionService: ISessionService) =>
				sessionService.apiFlags.modestBranding
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.modestBranding	= true;
			}
		},
		{
			analEvent: 'force-turn',
			character: '$',
			get: (sessionService: ISessionService) =>
				sessionService.apiFlags.disableP2P
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.disableP2P		= true;
			}
		}
	];

	/** Braintree-related config. */
	public readonly braintreeConfig	= {
		endpoint: 'braintree'
	};

	/** User-facing email addresses to include in places like contact forms. */
	public readonly contactEmailAddresses: string[]	= [
		'hello',
		'help',
		'feedback',
		'bugs',
		'b2b',
		'telehealth',
		'privacy'
	];

	/** Number of milliseconds before new cyph wait screen will abort. */
	public readonly cyphCountdown: number		= 600000;

	/** Length of server ID for a cyph. */
	public readonly cyphIDLength: number		= 7;

	/** Indicates the original language of any content to be translated. */
	public readonly defaultLanguage: string		= 'en';

	/** File-transfer-related config (used by Files.Files). */
	public readonly filesConfig	= {
		approvalLimit: 512000,
		maxImageWidth: 1920,
		maxSize: 268435456
	};

	/** Max signed 32-bit integer. */
	public readonly maxInt32: number			= 2147483647;

	/** Max unsigned 48-bit integer + 1, used by util/random. */
	public readonly maxSafeUint: number			= 281474976710656;

	/** Max unsigned 32-bit integer. */
	public readonly maxUint32: number			= 4294967295;

	/** URL for Cyph Tor site. */
	public readonly onionRoot: string			= 'cyphdbyhiddenbhs.onion';

	/** Pricing-related config. */
	public readonly pricingConfig: {
		categories: {
			[category: string]: {
				id: number;
				items: {
					[item: string]: {
						id: number;
						subscriptionType?: SubscriptionTypes;
					};
				};
			};
		};
	}	= {
		categories: {
			accounting: {
				id: 5,
				items: {
					generic: {id: 0}
				}
			},
			donation: {
				id: 0,
				items: {
					generic: {id: 0}
				}
			},
			enterprise: {
				id: 2,
				items: {
					basics: {
						id: 1,
						subscriptionType: SubscriptionTypes.monthly
					},
					beta: {id: 0},
					works: {id: 2}
				}
			},
			individual: {
				id: 1,
				items: {
					pro: {id: 0}
				}
			},
			legal: {
				id: 4,
				items: {
					generic: {id: 0}
				}
			},
			subscription: {
				id: 6,
				items: {
					annual: {
						id: 0,
						subscriptionType: SubscriptionTypes.annual
					},
					monthly: {
						id: 1,
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			},
			telehealth: {
				id: 3,
				items: {
					singlePractitioner: {
						id: 0,
						subscriptionType: SubscriptionTypes.monthly
					},
					smallPractice: {
						id: 1,
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			}
		}
	};

	/**
	 * Characters used by util/readableID (includes all alphanumeric
	 * characters except 'l' and 'I').
	 */
	public readonly readableIDCharacters: string[]	= [
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
		'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
		'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E',
		'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
		'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
	];

	/** @see {@link https://github.com/angular/flex-layout/wiki/Responsive-API} */
	public readonly responsiveMaxWidths		= {
		lg: 1919,
		md: 1279,
		sm: 959,
		xl: 5000,
		xs: 599
	};

	/** Length of random IDs in cyph links. */
	public readonly secretLength: number	= 25;

	/** WebSign-related config. */
	public readonly webSignConfig			= {
		serviceWorker: 'serviceworker.js'
	};

	constructor () {}
}

/** @see Config */
export const config	= new Config();
