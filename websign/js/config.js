var config	= {
	abortText: 'Loading Cyph failed. Please try again later.',
	packageTimestampURL: 'https://api.cyph.com/packagetimestamp/',
	packageURL: 'https://api.cyph.com/package/',

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
