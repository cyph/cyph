import {CyphPlans} from '../proto';
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

	/** Configuration options for Cyph plans. */
	public readonly planConfig: Record<CyphPlans, {
		initialInvites: number;
		storageCapGB: number;
		usernameMinLength: number;
		walletEarlyAccess?: string;
	}>	= {
		[CyphPlans.FoundersAndFriends]: {
			initialInvites: 15,
			storageCapGB: 100,
			usernameMinLength: 1,
			walletEarlyAccess: 'alpha'
		},
		[CyphPlans.Free]: {
			initialInvites: 0,
			storageCapGB: 1,
			usernameMinLength: 5
		},
		[CyphPlans.Gold]: {
			initialInvites: 10,
			storageCapGB: 25,
			usernameMinLength: 5,
			walletEarlyAccess: 'beta'
		},
		[CyphPlans.LifetimePlatinum]: {
			initialInvites: 15,
			storageCapGB: 100,
			usernameMinLength: 1,
			walletEarlyAccess: 'alpha'
		},
		[CyphPlans.Silver]: {
			initialInvites: 3,
			storageCapGB: 5,
			usernameMinLength: 5
		}
	};

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
	}	= {
		categories: {
			cyberMonday: {
				id: 7,
				items: {
					gold: {
						amount: 60,
						id: 1,
						name: 'Gold Plan'
					},
					platinum: {
						amount: 500,
						id: 2,
						name: 'Lifetime Platinum'
					},
					silver: {
						amount: 12,
						id: 0,
						name: 'Silver Plan'
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
				},
				namespace: 'cyph.pro'
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
			telehealthBasic: {
				id: 3,
				items: {
					annual: {
						amount: 228,
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
