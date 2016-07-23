var Config	= {
	abortText: 'Loading Cyph failed. Please try again later.',
	cdnUrlBase: '.cdn.cyph.com/',
	continentUrl: 'https://api.cyph.com/continent',
	defaultContinent: 'eu',

	files: [
		'./',
		'websign/js/workerhelper.js',
		'websign/appcache.appcache',
		'websign/manifest.json',
		'serviceworker.js',
		'unsupportedbrowser'
	],

	publicKeys: PUBLIC_KEYS
};
