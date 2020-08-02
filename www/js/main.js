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

/* Get package */
Promise.resolve().then(function () {
	function getPackage () {
		return Promise.race([
			new Promise(function (_, reject) { setTimeout(reject, 30000); }),
			fetchRetry(config.packageUrl + packageName).then(function (response) {
				return response.text();
			}).then(function (s) {
				var packageMetadata	= JSON.parse(s);
				var oldTimestamp	= parseInt(storage.webSignPackageTimestamp, 10);

				if (
					isNaN(packageMetadata.timestamp) ||
					oldTimestamp > packageMetadata.timestamp
				) {
					throw new Error('Outdated package.');
				}

				return packageMetadata;
			})
		]);
	}

	return getPackage().catch(function () {
		return getPackage();
	});
}).catch(function () {
	return JSON.parse(storage.webSignPackageMetadata || '{}');
}).

/* Open package */
then(function (packageMetadata) {
	var packageLines	= packageMetadata.package.root.trim().split('\n');

	var packageData		= {
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
		packageMetadata,
		packageData.signed,
		superSphincs.importKeys({
			public: {
				rsa: packageData.rsaKey,
				sphincs: packageData.sphincsKey
			}
		})
	]);
}).then(function (results) {
	var packageMetadata	= results[0];
	var signed			= results[1];
	var publicKey		= results[2].publicKey;

	return Promise.all([
		packageMetadata,
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
	var packageMetadata	= results[0];
	var opened			= JSON.parse(results[1]);

	/* Reject if expired or has invalid timestamp */
	if (
		Date.now() > opened.expires ||
		packageMetadata.timestamp !== opened.timestamp ||
		(
			packageName !== opened.packageName &&
			packageName !== opened.packageName.replace(/\.(app|ws)$/, '')
		)
	) {
		throw new Error('Stale or invalid data.');
	}

	storage.webSignExpires			= opened.expires;
	storage.webSignHashWhitelist	= JSON.stringify(opened.hashWhitelist);
	storage.webSignPackageMetadata	= JSON.stringify(packageMetadata);
	storage.webSignPackageName		= opened.packageName;
	storage.webSignPackageTimestamp	= opened.timestamp;

	return {
		package: opened.package,
		packageMetadata: packageMetadata
	};
}).

/* Successfully execute package */
then(function (o) {
	var headHTML	= o.package.split('<head>')[1].split('</head>')[0];

	if (device.platform === 'iOS') {
		headHTML	= headHTML.replace('href="/"', 'href="#"');
	}

	document.head.innerHTML	= headHTML;
	document.body.innerHTML	= o.package.split('<body>')[1].split('</body>')[0];

	webSignSRI(o.packageMetadata).catch(function (err) {
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
