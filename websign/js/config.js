var Config	= {
	abortText: 'Loading Cyph failed. Please try again later.',
	cdnUrlBase: '.cdn.cyph.com/',
	continentUrl: 'https://api.cyph.com/continent',
	defaultContinent: 'eu',

	files: [
		'/',
		'/js/workerhelper.js',
		'/appcache.appcache',
		'/manifest.json',
		'/serviceworker.js',
		'/unsupportedbrowser'
	],

	publicKeys: PUBLIC_KEYS
};
