var config	= {
	abortText: 'Loading Cyph failed. Please try again later.',
	additionalDataPackagePrefix: 'cyph.ws:webSign/packages/',
	additionalDataSignaturePrefix: 'cyph.ws:webSign/signatures/',
	algorithm: proto.PotassiumData.SignAlgorithms.V2Hardened,
	packageTimestampURL: 'https://api.cyph.com/websign/packagetimestamp/',
	packageURL: 'https://api.cyph.com/websign/package/',

	cyphBranches: [
		'beta',
		'master',
		'staging'
	],

	files: [
		'/',
		'/appcache.appcache',
		'/manifest.json',
		'/serviceworker.js',
		'/unsupportedbrowser'
	],

	publicKeys: PUBLIC_KEYS
};
