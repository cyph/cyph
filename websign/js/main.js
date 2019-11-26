(function () {


/* Initialize ServiceWorker where possible */
try {
	navigator.serviceWorker.register('/serviceworker.js').catch(function () {});
}
catch (_) {}
/* Request Persistent Storage permission to mitigate edge case eviction of ServiceWorker/AppCache */
try {
	navigator.storage.persist().catch(function () {});
}
catch (_) {}

var hostSplit		= location.host.split('.');
var isHiddenService	= hostSplit.slice(-1)[0] === 'onion';

var packageName		=
	!isHiddenService ?
		location.host :
	hostSplit[0] === 'app' ?
		'cyph.app' :
		hostSplit[0].replace(/_/g, '.')
;

/* Prefer native app on mobile where available */

if (packageName === 'cyph.app' && !isHiddenService && !storage.webSignAppRedirected) {
	storage.webSignAppRedirected	= true;

	var userAgent = navigator.userAgent.toLowerCase();

	if (/android/.test(userAgent)) {
		location = 'https://play.google.com/store/apps/details?id=com.cyph.app';
		return;
	}

	if (/ipad|iphone|ipod/.test(userAgent)) {
		location = 'itms-apps://itunes.apple.com/us/app/app/cyph/id1422086509';
		return;
	}
}

/* Set pin on www subdomain on first use, then force naked domain */
if (location.host.indexOf('www.') === 0) {
	location.host	= location.host.replace('www.', '');
	return;
}
else if (!isHiddenService && storage.isPersistent && !storage.webSignWWWPinned) {
	storage.webSignWWWPinned	= true;
	location.host				= 'www.' + location.host;
}

/* Different styling between the main Cyph environments and others */
var packageNameSplit	= packageName.split('.');
if (config.cyphBranches.indexOf(packageNameSplit[0]) > -1) {
	packageNameSplit	= packageNameSplit.slice(1);
}
if (packageNameSplit.length === 2 && packageNameSplit[0] === 'cyph') {
	document.getElementById('websign-load').className	= 'cyph-branded';
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

/* Before finishing, perform self-administered
	integrity check on WebSign bootstrap */
catch(function () {
	return null;
}).then(function (package) {
	return Promise.all([
		package,
		Promise.all(config.files.map(function (file) {
			return fetchRetry(file).then(function (response) {
				return response.text();
			});
		}))
	]);
}).then(function (results) {
	var package			= results[0];
	var fileContents	= results[1];

	var bootstrapText	= config.files.
		map(function (file, i) {
			return file + ':\n\n' + fileContents[i].trim();
		}).
		join('\n\n\n\n\n\n')
	;

	return Promise.all([
		package,
		bootstrapText,
		superSphincs.hash(bootstrapText)
	]);
}).then(function (results) {
	var package			= results[0];
	var bootstrapText	= results[1];
	var hash			= results[2].hex;

	storage.webSignHashOld	= storage.webSignHash;
	storage.webSignHash		= hash;

	var hashWhitelist	= JSON.parse(storage.webSignHashWhitelist);

	if (!hashWhitelist[storage.webSignHash]) {
		throw {
			webSignPanic: true,
			bootstrapText: bootstrapText
		};
	}
	else if (package) {
		return package;
	}

	throw null;
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
catch(function (err) {
	var messageElement;

	if (!err || !err.webSignPanic) {
		messageElement					= document.getElementById('websign-load-message');
		messageElement.innerText		= config.abortText;
	}
	else {
		messageElement					= document.getElementById('panic-message');
		messageElement.style.display	= 'block';

		/* Also try to warn us, though in a serious attack this may be blocked */
		fetchRetry('https://mandrillapp.com/api/1.0/messages/send.json', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: 'test@mandrillapp.com',
					to: [{
						email: 'errors@cyph.com',
						type: 'to'
					}],
					autotext: 'true',
					subject: 'CYPH: SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS',
					text:
						navigator.language + '\n\n' +
						navigator.userAgent + '\n\n' +
						location.toString().replace(/\/#.*/g, '') + '\n\n' +
						'\n\ncdn url: ' + storage.webSignCdnUrl +
						'\n\ncurrent bootstrap hash: ' + storage.webSignHash +
						'\n\nprevious bootstrap hash: ' + storage.webSignHashOld +
						'\n\npackage hash: ' + storage.webSignPackageHash +
						'\n\n\n\n' + err.bootstrapText
				}
			})
		});
	}

	var parent	= messageElement.parentElement;

	for (var i = parent.children.length - 1 ; i >= 0 ; --i) {
		var child	= parent.children[0];

		if (child !== messageElement) {
			parent.removeChild(child);
		}
	}
});


})();
