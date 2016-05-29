/**
 * Static/constant configuration values.
 */
export class Config {
	/** URL for Cyph Tor site. */
	public static onionRoot: string				= 'cyphdbyhiddenbhs.onion';

	/** Indicates the original language of any content to be translated. */
	public static defaultLanguage: string		= 'en';

	/** Length of server ID for a cyph. */
	public static cyphIdLength: number			= 7;

	/** Length of random IDs in cyph links. */
	public static secretLength: number			= 25;

	/** Length of random SQS queue IDs. */
	public static longSecretLength: number		= 52;

	/** Characters used by Util.generateGuid (includes all alphanumeric
		characters except 'l' and 'I' for readability reasons). */
	public static guidAddressSpace: string[]	= [
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
		'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
		'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E',
		'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
		'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
	];

	/** AWS-related config (used by Channel.Queue). */
	public static awsConfig	= {
		region: 'us-east-1',
		accessKeyId: 'AKIAIN2DSULSB77U4S2A',
		secretAccessKey: '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',
		apiVersions: {
			sqs: '2012-11-05'
		},

		/* Workaround for TorBrowser "feature" */
		signatureVersion: 'v2'
	};

	/** Endpoint reported by Fake SQS in local environments; used for replacing
		with the correct endpoint, since this isn't correct because of Docker. */
	public static awsEndpointFake: string	= 'http://0.0.0.0:4568';

	/** AWS regions used for SQS. */
	public static awsRegions: string[]	= [
		'us-east-1',
		'us-west-1',
		'us-west-2',
		'eu-west-1',
		'ap-southeast-1',
		'ap-northeast-1',
		'ap-southeast-2',
		'sa-east-1'
	];

	/** Affiliate code for Amazon links in chat (used by UI.Affiliate). */
	public static amazonAffiliateCode: string	= 'cyph-20';

	/** Angular-related config. */
	public static angularConfig	= {
		rootModule: 'Cyph',
		rootController: 'CyphController'
	};

	/** Braintree-related config. */
	public static braintreeConfig	= {
		endpoint: 'braintree'
	};

	/** Pricing-related config. */
	public static pricingConfig	= {
		categories: {
			donation: {
				id: 0,
				items: {
					generic: {id: 0}
				}
			},
			individual: {
				id: 1,
				items: {
					pro: {id: 0}
				}
			},
			enterprise: {
				id: 2,
				items: {
					beta: {id: 0},
					basics: {id: 1},
					works: {id: 2}
				}
			},
			telehealth: {
				id: 3,
				items: {
					solo: {id: 0},
					small: {id: 1}
				}
			},
			legal: {
				id: 4,
				items: {
					generic: {id: 0}
				}
			},
			accounting: {
				id: 5,
				items: {
					generic: {id: 0}
				}
			}
		}
	};

	/** File-transfer-related config (used by Files.Files). */
	public static filesConfig	= {
		chunkSize: 67108864,
		maxImageWidth: 1920,
		maxSize: 268435456
	};

	/** Notifier-related config (used by UI.Notifier). */
	public static notifierConfig	= {
		title: 'Cyph',
		icon: '/img/favicon/apple-touch-icon-180x180.png',
		audio: '/audio/beep.mp3'
	};

	/** WebSign-related config. */
	public static webSignConfig	= {
		serviceWorker: 'serviceworker.js',
		workerHelper: 'websign/js/workerhelper.js'
	};

	/** User-facing email addresses to include in places like contact forms. */
	public static cyphEmailAddresses: string[]	= [
		'hello',
		'help',
		'feedback',
		'bugs',
		'b2b',
		'telehealth',
		'privacy'
	];

	/** Max unsigned 32-bit integer. */
	public static maxUint32: number	= 4294967296;
}
