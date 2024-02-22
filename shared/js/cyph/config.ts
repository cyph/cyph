/* eslint-disable max-lines */

import pricingConfig from './pricing-config.json';
import {ISessionService} from './service-interfaces/isession.service';
import {syncfusionLicenseKey} from './syncfusion-license-key';

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

	/** Indicates the default Firebase region. */
	public readonly defaultFirebaseRegion: string = 'us-central1';

	/** Indicates the original language of any content to be translated. */
	public readonly defaultLanguage: string = 'en';

	/** Indicates whether the new Accounts file manager UI should be enabled. */
	public readonly enableNewFileManager: boolean = true;

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
						accountsPlan?: string;
						amount?: number;
						extraUserDiscount?: number;
						giftPack?: boolean;
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
						perUser?: boolean;
						subscriptionType?: 'annual' | 'monthly';
					};
				};
				namespace?: string;
			};
		};
	} = <any> pricingConfig;

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

	/** @see {@link https://github.com/ngbracket/ngx-layout/wiki/Responsive-API} */
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

	/** Stripe configuration. */
	public readonly stripe = {
		apiKeys: {
			prod: 'pk_live_Z5tqxXpBQp1oSuZ0bK3fZPQH',
			test: 'pk_test_q57rb0D1dJkZYKCaBlXTYiry'
		}
	};

	/** @see syncfusionLicenseKey */
	public readonly syncfusionLicenseKey: string = syncfusionLicenseKey;

	/** Mapping of WebSign redirect hostnames to routes. */
	public readonly webSignRedirects: Record<string, string[]> = {
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'burner.cyph.app': ['burner'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.audio': ['burner', 'audio'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.download': ['download'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.im': ['burner'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.io': ['burner', 'io'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.me': ['profile'],
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'cyph.video': ['burner', 'video']
	};

	constructor () {}
}

/** @see Config */
export const config = new Config();
