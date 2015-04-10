/// <reference path="globals.ts" />


class Config {
	public static prodBaseUrl: string	= 'https://api.cyph.com/';
	public static onionUrl: string		= 'https://cyphdbyhiddenbhs.onion/';


	public static secretLength: number		= 14;
	public static longSecretLength: number	= 52;

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

		/* Workaround for TorBrowser "features" */
		signatureVersion: 'v2'
	};

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


	public static p2pConfig	= {
		iceServer: 'ice.cyph.com',
		iceCredential: 'cyph',
		fileChunkSize: 5000,
		maxFileSize: 1100000000
	};


	public static validWebSignHashes: {[hash: string] : boolean}	= {
		'2bc65ee1082f94261c9127ad765d4b670d24ca321222e638cf4409e325218828c5732f7c8e76d2f229ebdab6c95a30510cd2d73425699ef860d527a06c5e69ae': true,
		'85477981ccd7f019eb52a8bb8f9be2668cf4cd0e19ec6450b3d00916bad1d752eedb0e9488160aae4e90df129b109d56ac49c34795b9b4994f071f484028abf0': true,
		'0b12302d910309849d8c1ce8a931886d3b9536c81b5598cd27c176a7ce34123247f1faa484a62d42470d3a5dd7c7177a5bd0905ced9e3fe06d2aade97724fcd3': true,
		'5829995351b4900ae4a3426022c0c13844ad4e9f642f1e4b4b69f9ac4d265c40f8f369a2a2b99f1cb31f0aed944dbeefc297cff815f7db0e88733929be2794c8': true,
		'957a0b1ceb6014320764e0fdc3b6dca69266474dbb1bbb2080f6da90d2a0d85d79a92e71c8b6151137711806c2304d5857f39e0abfbacdac298e1095fd772539': true,
		'0e06009cc4bc6c491060a2f075135d277a691faa852504b213bd1dd70d75096c837837284654d7b5e78b8140617a99faa8b044df0ee456032064430e067ec923': true
	};
}
