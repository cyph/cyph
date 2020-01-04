import {SubscriptionTypes} from './checkout';
import {ISessionService} from './service-interfaces/isession.service';

/**
 * Static/constant configuration values.
 */
export class Config {
	/** Configuration of available API flags. */
	public readonly apiFlags = [
		{
			analEvent: 'modest-branding',
			character: '!',
			get: (sessionService: ISessionService) =>
				sessionService.apiFlags.modestBranding,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.modestBranding = true;
			}
		},
		{
			analEvent: 'force-turn',
			character: '$',
			get: (sessionService: ISessionService) =>
				sessionService.apiFlags.disableP2P,
			set: (sessionService: ISessionService) => {
				sessionService.apiFlags.disableP2P = true;
			}
		}
	];

	/** Whitelist of users to serve beta package to. */
	public readonly betaTestUsers: Set<string> = new Set([
		'cyph',
		'josh',
		'ryan'
	]);

	/** BitPay POS auth token. */
	public readonly bitPayToken: string =
		'CsLk78BjUj81tBENkNpZxoPFGJWWss5qsga86xDKFWBR';

	/** User-facing email addresses to include in places like contact forms. */
	public readonly contactEmailAddresses: string[] = [
		'hello',
		'help',
		'feedback',
		'bugs',
		'b2b',
		'telehealth',
		'privacy'
	];

	/** Number of milliseconds before new cyph wait screen will abort. */
	public readonly cyphCountdown: number = 600000;

	/** Length of server ID for a cyph. */
	public readonly cyphIDLength: number = 7;

	/** Indicates the original language of any content to be translated. */
	public readonly defaultLanguage: string = 'en';

	/**
	 * Master key configuration.
	 *
	 * `defaultSize` refers to an index in `sizes`.
	 * `sizes` is a list of bits of entropy for generated keys.
	 */
	public readonly masterKey = {
		customMinLength: 20,
		defaultSize: 3,
		sizes: [0, 64, 80, 128, 256],
		sizeStrength: (n: number) : 'very-high' | 'high' | 'medium' | 'low' =>
			n > 3 ? 'very-high' : n === 3 ? 'high' : n === 2 ? 'medium' : 'low'
	};

	/** Max signed 32-bit integer. */
	public readonly maxInt32: number = 2147483647;

	/** Max unsigned 48-bit integer + 1, used by util/random. */
	public readonly maxSafeUint: number = 281474976710656;

	/** Max unsigned 32-bit integer. */
	public readonly maxUint32: number = 4294967295;

	/** URL for Cyph Tor site. */
	public readonly onionRoot: string = 'cyphdbyhiddenbhs.onion';

	/** Pricing-related config. */
	public readonly pricingConfig: {
		categories: {
			[category: string]: {
				id: number;
				items: {
					[item: string]: {
						amount?: number;
						extraUserDiscount?: number;
						id: number;
						name?: string;
						perUser?: boolean;
						subscriptionType?: SubscriptionTypes;
					};
				};
				namespace?: string;
			};
		};
	} = {
		categories: {
			accounts: {
				id: 8,
				items: {
					annualPremium: {
						amount: 144,
						id: 1,
						name: 'Annual Premium',
						subscriptionType: SubscriptionTypes.annual
					},
					monthlyPremium: {
						amount: 15,
						id: 0,
						name: 'Monthly Premium',
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			},
			donation: {
				id: 10000,
				items: {
					donation: {id: 0}
				}
			},
			ephemeral: {
				id: 4,
				items: {
					businessAnnual: {
						amount: 588,
						id: 4,
						subscriptionType: SubscriptionTypes.annual
					},
					businessMonthly: {
						amount: 99,
						id: 3,
						subscriptionType: SubscriptionTypes.monthly
					},
					proAnnual: {
						amount: 168,
						id: 2,
						subscriptionType: SubscriptionTypes.annual
					},
					proMonthly: {
						amount: 29,
						id: 1,
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			},
			hint: {
				id: 5,
				items: {
					annual: {
						amount: 168,
						id: 2,
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					monthly: {
						amount: 29,
						id: 1,
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					}
				},
				namespace: 'video.cyph.healthcare'
			},
			holidaySale: {
				id: 9,
				items: {
					annualPremium: {
						amount: 90,
						id: 1,
						name: 'Annual Premium',
						subscriptionType: SubscriptionTypes.annual
					},
					lifetimePlatinum: {
						amount: 450,
						id: 2,
						name: 'Lifetime Platinum'
					},
					monthlyPremium: {
						amount: 10,
						id: 0,
						name: 'Monthly Premium',
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			},
			subscription: {
				id: 1,
				items: {
					annual: {
						id: 2,
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
					annual: {
						amount: 420,
						id: 2,
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					monthly: {
						amount: 50,
						id: 1,
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					}
				},
				namespace: 'cyph.healthcare'
			},
			telehealthPro: {
				id: 6,
				items: {
					singlePractitioner: {
						amount: 250,
						id: 1,
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					smallPractice: {
						amount: 1000,
						id: 2,
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					}
				},
				namespace: 'video.cyph.healthcare'
			}
		}
	};

	/**
	 * Characters used by util/readableID (includes all alphanumeric
	 * characters except 'l' and 'I').
	 */
	public readonly readableIDCharacters: string[] = [
		'0',
		'1',
		'2',
		'3',
		'4',
		'5',
		'6',
		'7',
		'8',
		'9',
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'h',
		'i',
		'j',
		'k',
		'm',
		'n',
		'o',
		'p',
		'q',
		'r',
		's',
		't',
		'u',
		'v',
		'w',
		'x',
		'y',
		'z',
		'A',
		'B',
		'C',
		'D',
		'E',
		'F',
		'G',
		'H',
		'J',
		'K',
		'L',
		'M',
		'N',
		'O',
		'P',
		'Q',
		'R',
		'S',
		'T',
		'U',
		'V',
		'W',
		'X',
		'Y',
		'Z'
	];

	/** @see {@link https://github.com/angular/flex-layout/wiki/Responsive-API} */
	public readonly responsiveMaxWidths = {
		lg: 1919,
		md: 1279,
		sm: 959,
		xl: 5000,
		xs: 599
	};

	/** Length of random IDs in cyph links. */
	public readonly secretLength: number = 25;

	/** Mapping of WebSign redirect hostnames to routes. */
	public readonly webSignRedirects: Record<string, string[]> = {
		'burner.cyph.app': ['burner'],
		'cyph.audio': ['burner', 'audio'],
		'cyph.im': ['burner'],
		'cyph.io': ['burner', 'io'],
		'cyph.me': ['profile'],
		'cyph.video': ['burner', 'video'],
		'cyph.ws': ['burner']
	};

	constructor () {}
}

/** @see Config */
export const config = new Config();
