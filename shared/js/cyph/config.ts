import {ISessionService} from './service-interfaces/isession.service';


/**
 * Static/constant configuration values.
 */
export class Config {
	/** Configuration of available API flags. */
	public readonly apiFlags	= [
		{
			analEvent: 'telehealth',
			character: '@',
			get: (sessionService: ISessionService) : string =>
				sessionService.apiFlags.telehealth ? this.apiFlags[0].character : ''
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.telehealth		= true;
			}
		},
		{
			analEvent: 'modest-branding',
			character: '&',
			get: (sessionService: ISessionService) : string =>
				sessionService.apiFlags.modestBranding ? this.apiFlags[1].character : ''
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.modestBranding	= true;
			}
		},
		{
			analEvent: 'force-turn',
			character: '$',
			get: (sessionService: ISessionService) : string =>
				sessionService.apiFlags.forceTURN ? this.apiFlags[2].character : ''
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.forceTURN		= true;
			}
		},
		{
			analEvent: 'native-crypto',
			character: '%',
			get: (sessionService: ISessionService) : string =>
				sessionService.apiFlags.nativeCrypto ? this.apiFlags[3].character : ''
			,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.nativeCrypto	= true;
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
	public readonly cyphIdLength: number		= 7;

	/** Indicates the original language of any content to be translated. */
	public readonly defaultLanguage: string		= 'en';

	/** File-transfer-related config (used by Files.Files). */
	public readonly filesConfig	= {
		approvalLimit: 512000,
		maxImageWidth: 1920,
		maxSize: 268435456
	};

	/** Max unsigned 48-bit integer + 1, used by Util.random. */
	public readonly maxSafeUint: number			= 281474976710656;

	/** URL for Cyph Tor site. */
	public readonly onionRoot: string			= 'cyphdbyhiddenbhs.onion';

	/** Pricing-related config. */
	public readonly pricingConfig: {
		categories: {
			[category: string]: {
				id: number;
				items: {
					[item: string]: {
						amount: number;
						id: number;
					};
				};
			};
		};
	}	= {
		categories: {
			accounting: {
				id: 5,
				items: {
					generic: {
						amount: 0,
						id: 0
					}
				}
			},
			donation: {
				id: 0,
				items: {
					generic: {
						amount: 0,
						id: 0
					}
				}
			},
			enterprise: {
				id: 2,
				items: {
					basics: {
						amount: 0,
						id: 1
					},
					beta: {
						amount: 499,
						id: 0
					},
					works: {
						amount: 0,
						id: 2
					}
				}
			},
			individual: {
				id: 1,
				items: {
					pro: {
						amount: 0,
						id: 0
					}
				}
			},
			legal: {
				id: 4,
				items: {
					generic: {
						amount: 0,
						id: 0
					}
				}
			},
			telehealth: {
				id: 3,
				items: {
					singlePractitioner: {
						amount: 250,
						id: 0
					},
					smallPractice: {
						amount: 1000,
						id: 1
					}
				}
			}
		}
	};

	/**
	 * Characters used by Util.readableId (includes all alphanumeric
	 * characters except 'l' and 'I').
	 */
	public readonly readableIdCharacters: string[]	= [
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
		'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
		'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E',
		'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
		'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
	];

	/** Length of random IDs in cyph links. */
	public readonly secretLength: number	= 25;

	/** WebSign-related config. */
	public readonly webSignConfig			= {
		serviceWorker: 'serviceworker.js',
		workerHelper: 'js/workerhelper.js'
	};

	constructor () {}
}

/** @see Config */
export const config	= new Config();
