/* eslint-disable max-lines */

import {SubscriptionTypes} from './checkout';
import {ISessionService} from './service-interfaces/isession.service';

/**
 * Static/constant configuration values.
 */
export class Config {
	/** Analytics configuration. */
	public readonly analConfig = {
		accountID: 'UA-56220601-1'
	};

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

	/** Blockchain.com API key. */
	public readonly blockchainAPIKey: string =
		'327ea4c2-7295-4ac0-a52a-08e39dad8793';

	/** User-facing email addresses to include in places like contact forms. */
	public readonly contactEmailAddresses: string[] = [
		'support',
		'investment',
		'press',
		'b2b',
		'bugs',
		'sales',
		'telehealth',
		'other'
	];

	/** Number of milliseconds before new cyph wait screen will abort. */
	public readonly cyphCountdown: number = 600000;

	/** Length of server ID for a cyph. */
	public readonly cyphIDLength: number = 7;

	/** Indicates the default country code. */
	public readonly defaultCountryCode: string = 'US';

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
		sizeStrength: (n: number) : 'very-high' | 'high' | 'medium' | 'low' =>
			n > 3 ? 'very-high' : n === 3 ? 'high' : n === 2 ? 'medium' : 'low',
		sizes: [0, 64, 80, 128, 256]
	};

	/** Max signed 32-bit integer. */
	public readonly maxInt32: number = 2147483647;

	/** Max unsigned 48-bit integer + 1, used by util/random. */
	public readonly maxSafeUint: number = 281474976710656;

	/** Max unsigned 32-bit integer. */
	public readonly maxUint32: number = 4294967295;

	/** URL for Cyph Tor site. */
	public readonly onionRoot: string = 'cyphdbyhiddenbhs.onion';

	/** Discount rate for partner checkouts. */
	public readonly partnerDiscountRate: number = 20;

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
						inAppPurchaseConfig?: {
							alias: string;
							amount: number;
							id: string;
							type: string;
						};
						individualSubscriptions?: boolean;
						maxUsers?: number;
						minUsers?: number;
						name?: string;
						offerID?: number;
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
					annualBusiness: {
						amount: 168,
						id: 9,
						individualSubscriptions: true,
						name: 'Business (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					annualPlatinum: {
						amount: 324,
						id: 5,
						individualSubscriptions: true,
						name: 'Platinum (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					annualPremium: {
						amount: 108,
						id: 1,
						individualSubscriptions: true,
						name: 'Premium (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					annualSupporter: {
						amount: 36,
						id: 7,
						individualSubscriptions: true,
						name: 'Supporter (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					annualTelehealth: {
						amount: 420,
						id: 3,
						individualSubscriptions: true,
						name: 'Telehealth (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					monthlyBusiness: {
						amount: 20,
						id: 8,
						individualSubscriptions: true,
						name: 'Business (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					monthlyPlatinum: {
						amount: 48,
						id: 4,
						inAppPurchaseConfig: {
							alias: 'Monthly Platinum',
							amount: 69,
							id: 'MonthlyPlatinum',
							type: 'PAID_SUBSCRIPTION'
						},
						individualSubscriptions: true,
						name: 'Platinum (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					monthlyPremium: {
						amount: 12,
						id: 0,
						individualSubscriptions: true,
						name: 'Premium (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					monthlySupporter: {
						amount: 6,
						id: 6,
						individualSubscriptions: true,
						name: 'Supporter (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					monthlyTelehealth: {
						amount: 50,
						id: 2,
						individualSubscriptions: true,
						name: 'Telehealth (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					}
				}
			},
			business: {
				id: 11,
				items: {
					erw8ib3: {
						amount: 108,
						id: 8,
						individualSubscriptions: true,
						name: 'Business (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					g7xxm0r: {
						amount: 12,
						id: 7,
						individualSubscriptions: true,
						name: 'Business (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					largeAnnual: {
						amount: 84,
						id: 6,
						individualSubscriptions: true,
						minUsers: 50,
						name: 'Business (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					largeMonthly: {
						amount: 9,
						id: 5,
						individualSubscriptions: true,
						minUsers: 50,
						name: 'Business (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					mediumAnnual: {
						amount: 108,
						id: 4,
						individualSubscriptions: true,
						maxUsers: 49,
						minUsers: 10,
						name: 'Business (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					mediumMonthly: {
						amount: 12,
						id: 3,
						individualSubscriptions: true,
						maxUsers: 49,
						minUsers: 10,
						name: 'Business (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					smallAnnual: {
						amount: 120,
						id: 2,
						individualSubscriptions: true,
						maxUsers: 9,
						name: 'Business (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					smallMonthly: {
						amount: 14,
						id: 1,
						individualSubscriptions: true,
						maxUsers: 9,
						name: 'Business (Monthly)',
						perUser: true,
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
			flashSale: {
				id: 10,
				items: {
					lifetimePlatinum: {
						amount: 100,
						id: 1,
						name: 'Lifetime Platinum (Flash Sale)'
					}
				}
			},
			freedomSale: {
				id: 12,
				items: {
					annualSupporter: {
						amount: 17.76,
						id: 0,
						individualSubscriptions: true,
						name: 'Supporter (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					monthlyPlatinum: {
						amount: 17.76,
						id: 1,
						individualSubscriptions: true,
						name: 'Platinum (Monthly)',
						perUser: true,
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
					covidLargeAnnual: {
						amount: 120,
						id: 8,
						individualSubscriptions: true,
						minUsers: 50,
						name: 'Telehealth (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					covidLargeMonthly: {
						amount: 15,
						id: 7,
						individualSubscriptions: true,
						minUsers: 50,
						name: 'Telehealth (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					covidMediumAnnual: {
						amount: 192,
						id: 6,
						individualSubscriptions: true,
						maxUsers: 49,
						minUsers: 10,
						name: 'Telehealth (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					covidMediumMonthly: {
						amount: 20,
						id: 5,
						individualSubscriptions: true,
						maxUsers: 49,
						minUsers: 10,
						name: 'Telehealth (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					covidSmallAnnual: {
						amount: 216,
						id: 4,
						individualSubscriptions: true,
						maxUsers: 9,
						name: 'Telehealth (Annual)',
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					covidSmallMonthly: {
						amount: 25,
						id: 3,
						individualSubscriptions: true,
						maxUsers: 9,
						name: 'Telehealth (Monthly)',
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					},
					erw8ib3: {
						amount: 108,
						id: 10,
						individualSubscriptions: true,
						name: 'Telehealth (Annual)',
						offerID: 3,
						perUser: true,
						subscriptionType: SubscriptionTypes.annual
					},
					g7xxm0r: {
						amount: 12,
						id: 9,
						individualSubscriptions: true,
						name: 'Telehealth (Monthly)',
						offerID: 2,
						perUser: true,
						subscriptionType: SubscriptionTypes.monthly
					}
				}
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

	/** List of emoji for simple picker. */
	public readonly simpleEmoji = [
		'1F44D' /* +1 */,
		'2764-FE0F' /* heart */,
		'1F389' /* tada */,
		'1F604' /* smile */,
		'1F62E' /* open_mouth */,
		'1F44A' /* punch */,
		'1F680' /* rocket */,
		'1F440' /* eyes */,
		'1F622' /* cry */,
		'1F615' /* confused */,
		'1F621' /* rage */,
		'1F44E' /* -1 */
	];

	/** @see Config.simpleEmoji */
	public readonly simpleEmojiSet = new Set(this.simpleEmoji);

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
