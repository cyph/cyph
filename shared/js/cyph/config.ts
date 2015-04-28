module Cyph {
	export class Config {
		public static onionUrl: string	= 'https://cyphdbyhiddenbhs.onion/';

		public static defaultLanguage: string	= 'en';


		public static secretLength: number			= 14;
		public static longSecretLength: number		= 52;

		public static guidAddressSpace: string[]	= [
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
			'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
			'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E',
			'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
			'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
		];


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

		public static awsEndpointFake: string	= 'http://0.0.0.0:4568';

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

		public static amazonAffiliateCode: string	= 'cyph-20';


		public static p2pConfig	= {
			iceServer: 'ice.cyph.com',
			iceCredential: 'cyph',
			fileChunkSize: 5000,
			maxFileSize: 1100000000
		};


		public static notifierConfig	= {
			title: 'Cyph',
			icon: '/img/favicon/apple-touch-icon-180x180.png',
			audio: '/audio/beep.mp3'
		};


		public static photoConfig	= {
			maxWidth: 1920
		};


		public static webSignConfig	= {
			serviceWorker: '/websign/js/cyph.im.serviceworker.js',
			workerHelper: '/websign/js/workerhelper.js'
		};
	}
}
