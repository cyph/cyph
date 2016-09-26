var isHiddenService	= location.host.split('.').slice(-1)[0] === 'onion';

var packageName		= isHiddenService ?
	location.host.split('.')[0].replace(/_/g, '.') :
	location.host
;

/* Set pin on www subdomain on first use, then force naked domain */
if (location.host.indexOf('www.') === 0) {
	location.host	= location.host.replace('www.', '');
}
else if (!isHiddenService && !localStorage.webSignWWWPinned) {
	localStorage.webSignWWWPinned	= true;
	location.host					= 'www.' + location.host;
}

/* Initialize ServiceWorker where possible */
try {
	navigator.serviceWorker.
		register('/serviceworker.js').
		catch(function () {})
	;
}
catch (_) {}

/* Get user's current location to choose optimal CDN node */
Promise.resolve().then(function () {
	if (isHiddenService) {
		return null;
	}

	return fetch(Config.continentUrl).then(function (response) {
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

		return new Promise(function (resolve, reject) {
			setTimeout(reject, 2000);

			fetch(
				cdnUrl + 'current?' + Date.now()
			).then(function (response) {
				return response.text();
			}).then(function (s) {
				var newTimestamp	= parseInt(s.trim(), 10);

				var oldTimestamp	= parseInt(
					localStorage.webSignPackageTimestamp,
					10
				);

				if (oldTimestamp > newTimestamp) {
					reject();
					return;
				}

				resolve({
					cdnUrl: cdnUrl,
					packageTimestamp: newTimestamp
				});
			});
		});
	}

	if (continent) {
		return getCurrent(continent, Config.cdnUrlBase).catch(function () {
			return getCurrent(Config.defaultContinent, Config.cdnUrlBase);
		});
	}
	else {
		return getCurrent('', 'cdn.cyphdbyhiddenbhs.onion/');
	}
}).catch(function () {
	return {
		cdnUrl: localStorage.webSignCdnUrl,
		packageTimestamp: parseInt(
			localStorage.webSignPackageTimestamp,
			10
		)
	};
}).

/* Get package */
then(function (downloadMetadata) {
	return Promise.all([
		downloadMetadata,
		fetch(
			downloadMetadata.cdnUrl + 'pkg?' + downloadMetadata.packageTimestamp
		).then(function (response) {
			return response.text();
		})
	]);
}).

/* Open package */
then(function (results) {
	var downloadMetadata	= results[0];
	var packageLines		= results[1].trim().split('\n');

	var packageData	= {
		signed: packageLines[0],
		rsaKey: Config.publicKeys.rsa[
			parseInt(packageLines[1], 10)
		],
		sphincsKey: Config.publicKeys.sphincs[
			parseInt(packageLines[2], 10)
		]
	};

	if (!packageData.rsaKey || !packageData.sphincsKey) {
		throw 'No valid public key specified.';
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
		superSphincs.open(
			signed,
			publicKey
		)
	]);
}).then(function (results) {
	var downloadMetadata	= results[0];
	var opened				= JSON.parse(results[1]);

	/* Reject if expired or has invalid timestamp */
	if (
		Date.now() > opened.expires ||
		downloadMetadata.packageTimestamp !== opened.timestamp ||
		packageName !== opened.packageName
	) {
		throw 'Stale or invalid data.';
	}

	localStorage.webSignExpires				= opened.expires;
	localStorage.webSignHashWhitelist		= JSON.stringify(opened.hashWhitelist);
	localStorage.webSignPackageTimestamp	= opened.timestamp;
	localStorage.webSignCdnUrl				= downloadMetadata.cdnUrl;

	return opened.package;
}).

/* Before finishing, perform self-administered
	integrity check on WebSign bootstrap */
catch(function () {
	return null;
}).then(function (package) {
	return Promise.all([
		package,
		Promise.all(Config.files.map(function (file) {
			return fetch(file).then(function (response) {
				return response.text();
			});
		}))
	]);
}).then(function (results) {
	var package			= results[0];
	var fileContents	= results[1];

	var bootstrapText	= Config.files.
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

	localStorage.webSignHashOld	= localStorage.webSignHash;
	localStorage.webSignHash	= hash;

	var hashWhitelist	= JSON.parse(localStorage.webSignHashWhitelist);

	if (!hashWhitelist[localStorage.webSignHash]) {
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
	var html	=
		(package.
			split('</html>').slice(0, -1).join('</html>').
			split('</body>').slice(0, -1).join('</body>')
		) +
			Array.prototype.slice.apply(
				document.querySelectorAll('script[websign-sri-include]')
			).map(function (elem) { return elem.outerHTML }).join('') +
			'<script>' +
				'WebSignSRI(' +
					'"' + localStorage.webSignCdnUrl + '"' +
				').catch(function (err) {' +
					'document.open("text/plain");' +
					'document.write(err);' +
					'document.close();' +
				'});' +
			'</script>' +
		'</body></html>'
	;

	try {
		document.open('text/html');
		document.write(html);
		document.close();
	}
	catch (_) {}
}).

/* Display either abortion screen or panic screen, depening on the error */
catch(function (err) {
	var messageElement;

	if (!err || !err.webSignPanic) {
		messageElement					= document.getElementById('pre-load-message');
		messageElement.innerText		= Config.abortText;
	}
	else {
		messageElement					= document.getElementById('panic-message');
		messageElement.style.display	= 'block';

		/* Also try to warn us, though in a serious attack this may be blocked */
		fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
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
						'\n\ncdn url: ' + localStorage.webSignCdnUrl +
						'\n\ncurrent bootstrap hash: ' + localStorage.webSignHash +
						'\n\nprevious bootstrap hash: ' + localStorage.webSignHashOld +
						'\n\npackage hash: ' + localStorage.webSignPackageHash +
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
