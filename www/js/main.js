document.addEventListener('DOMContentLoaded', function () {
document.addEventListener('deviceready', function () {


document.addEventListener('backbutton', function (e) {
	if (typeof self.onbackbutton === 'function') {
		self.onbackbutton(e);
	}
});

self.cordovaParent	= location.toString() + '/../';
self.cordovaRequire	= self.require;

/* Initialize ServiceWorker where possible */
try {
	navigator.serviceWorker.register('serviceworker.js').catch(function () {});
}
catch (_) {}
/* Request Persistent Storage permission to mitigate edge case eviction of ServiceWorker/AppCache */
try {
	navigator.storage.persist().catch(function () {});
}
catch (_) {}

try {
	if (cordova && cordova.plugins && cordova.plugins.iosrtc) {
		cordova.plugins.iosrtc.registerGlobals();
	}
}
catch (_) {}

var isHiddenService	= false;
var packageName		= 'cyph.app';

if (storage.betaTestUser) {
	packageName		= 'beta.cyph.app';

	if (!storage.betaTestInitialized) {
		storage.betaTestInitialized	= true;

		delete storage.webSignCdnUrl;
		delete storage.webSignExpires;
		delete storage.webSignHashWhitelist;
		delete storage.webSignPackageTimestamp;
	}
}

/* Get user's current location to choose optimal CDN node */
Promise.resolve().then(function () {
	if (isHiddenService) {
		return null;
	}

	return fetchRetry(config.continentUrl).then(function (response) {
		return response.text();
	}).then(function (s) {
		return s.trim();
	});
}).

/* Get current package timestamp from CDN, with fallback logic
	in case node for current continent is offline */
then(function (continent) {
	function getCurrent (newContinent, cdnUrlBase) {
		var cdnUrl	=
			'https://' +
			newContinent +
			cdnUrlBase +
			packageName +
			'/'
		;

		return Promise.race([
			new Promise(function (_, reject) { setTimeout(reject, 30000); }),
			fetchRetry(
				cdnUrl + 'current?' + Date.now()
			).then(function (response) {
				return response.text();
			}).then(function (s) {
				var newTimestamp	= parseInt(s.trim(), 10);
				var oldTimestamp	= parseInt(storage.webSignPackageTimestamp, 10);

				if (oldTimestamp > newTimestamp) {
					throw new Error('Outdated package.');
				}

				return {
					cdnUrl: cdnUrl,
					packageTimestamp: newTimestamp
				};
			})
		]);
	}

	if (continent) {
		return getCurrent(continent, config.cdnUrlBase).catch(function () {
			return getCurrent(config.defaultContinent, config.cdnUrlBase);
		});
	}
	else {
		return getCurrent('', config.cdnUrlBaseOnion);
	}
}).catch(function () {
	return {
		cdnUrl: storage.webSignCdnUrl,
		packageTimestamp: parseInt(storage.webSignPackageTimestamp, 10)
	};
}).

/* Get package */
then(function (downloadMetadata) {
	if (!downloadMetadata.cdnUrl || isNaN(downloadMetadata.packageTimestamp)) {
		throw new Error('Could not get a valid package URL.');
	}

	return Promise.all([
		downloadMetadata,
		cachingFetch(
			downloadMetadata.cdnUrl + 'pkg?' + downloadMetadata.packageTimestamp
		)
	]);
}).

/* Open package */
then(function (results) {
	var downloadMetadata	= results[0];
	var packageLines		= results[1].trim().split('\n');

	var packageData	= {
		signed: packageLines[0],
		rsaKey: config.publicKeys.rsa[
			parseInt(packageLines[1], 10)
		],
		sphincsKey: config.publicKeys.sphincs[
			parseInt(packageLines[2], 10)
		]
	};

	if (!packageData.rsaKey || !packageData.sphincsKey) {
		throw new Error('No valid public key specified.');
	}

	return Promise.all([
		downloadMetadata,
		packageData.signed,
		superSphincs.importKeys({
			public: {
				rsa: packageData.rsaKey,
				sphincs: packageData.sphincsKey
			}
		})
	]);
}).then(function (results) {
	var downloadMetadata	= results[0];
	var signed				= results[1];
	var publicKey			= results[2].publicKey;

	return Promise.all([
		downloadMetadata,
		/* Temporary transitionary step */
		superSphincs.openString(
			signed,
			publicKey
		).catch(function () {
			return superSphincs.openString(
				signed,
				publicKey,
				new Uint8Array(0)
			);
		})
	]);
}).then(function (results) {
	var downloadMetadata	= results[0];
	var opened				= JSON.parse(results[1]);

	/* Reject if expired or has invalid timestamp */
	if (
		Date.now() > opened.expires ||
		downloadMetadata.packageTimestamp !== opened.timestamp ||
		(
			packageName !== opened.packageName &&
			packageName !== opened.packageName.replace(/\.(app|ws)$/, '')
		)
	) {
		throw new Error('Stale or invalid data.');
	}

	storage.webSignExpires			= opened.expires;
	storage.webSignHashWhitelist	= JSON.stringify(opened.hashWhitelist);
	storage.webSignPackageTimestamp	= opened.timestamp;
	storage.webSignCdnUrl			= downloadMetadata.cdnUrl;

	return opened.package;
}).

/* Successfully execute package */
then(function (package) {
	document.head.innerHTML	= package.split('<head>')[1].split('</head>')[0];
	document.body.innerHTML	= package.split('<body>')[1].split('</body>')[0];

	webSignSRI(storage.webSignCdnUrl).catch(function (err) {
		document.head.innerHTML		= '';
		document.body.textContent	= err;
	});
}).

/* Display either abortion screen or panic screen, depening on the error */
catch(function () {
	var messageElement			= document.getElementById('websign-load-message');
	messageElement.innerText	= config.abortText;

	var parent	= messageElement.parentElement;

	for (var i = parent.children.length - 1 ; i >= 0 ; --i) {
		var child	= parent.children[0];

		if (child !== messageElement) {
			parent.removeChild(child);
		}
	}
});


}); });
