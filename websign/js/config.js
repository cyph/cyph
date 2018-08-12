var config	= {
	abortText: 'Loading Cyph failed. Please try again later.',
	cdnUrlBase: '.cdn.cyph.com/',
	cdnUrlBaseOnion: 'cdn.cyphdbyhiddenbhs.onion/',
	continentUrl: 'https://api.cyph.com/continent',
	defaultContinent: 'eu',

	cyphBranches: [
		/^beta\./,
		/^master\./,
		/^staging\./
	],

	cyphBrandedPackages: {
		'cyph.audio': true,
		'cyph.chat': true,
		'cyph.healthcare': true,
		'cyph.im': true,
		'cyph.io': true,
		'cyph.me': true,
		'cyph.pro': true,
		'cyph.video': true,
		'cyph.ws': true,
	},

	files: [
		'/',
		'/appcache.appcache',
		'/manifest.json',
		'/serviceworker.js',
		'/unsupportedbrowser'
	],

	publicKeys: PUBLIC_KEYS
};
