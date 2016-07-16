(function () {


if (location.host.indexOf('www.') === 0) {
	location.host	= location.host.replace('www.', '');
}
else if (
	LocalStorage.isPersistent &&
	!LocalStorage.webSignWWWPinned
) {
	LocalStorage.webSignWWWPinned	= true;
	location.host					= 'www.' + location.host;
}


var WebSign	= {
	bootstrapText: '',

	cdnUrl: '',

	isOnion: location.host.split('.').slice(-1)[0] === 'onion',

	config: {
		abortText: 'Loading Cyph failed. Please try again later.',
		cdnUrlBase: '.cdn.cyph.com/',
		continentUrl: 'https://api.cyph.com/continent',
		defaultContinent: 'eu',
		signaturePath: 'sig',
		packagePath: 'pkg',

		files: [
			'./',
			'websign/js/workerhelper.js',
			'websign/appcache.appcache',
			'websign/manifest.json',
			'serviceworker.js',
			'unsupportedbrowser'
		],

		publicKeys: PUBLIC_KEYS
	}
};

if (WebSign.isOnion) {
	WebSign.config.cdnUrlBase		= 'cdn.cyphdbyhiddenbhs.onion/';
	WebSign.config.defaultContinent	= '';
}

try {
	navigator.serviceWorker.
		register('serviceworker.js').
		catch(function () {})
	;
}
catch (_) {}


/* Hash WebSign bootstrap for a self-administered integrity check */
Promise.all(
	WebSign.config.files.map(function (file) {
		return fetch(file).then(function (response) {
			return response.text();
		});
	})
).then(function (results) {
	WebSign.bootstrapText	= WebSign.config.files.
		map(function (file, i) {
			return file + ':\n\n' + results[i] + '\n\n\n\n\n\n';
		}).
		join('')
	;

	return superSphincs.hash(WebSign.bootstrapText);
}).then(function (hash) {
	LocalStorage.webSignHashOld	= LocalStorage.webSignHash;
	LocalStorage.webSignHash	= hash.hex;
}).

/* Get user's current location to choose optimal CDN node */
then(function () {
	if (!WebSign.isOnion) {
		return fetch(WebSign.config.continentUrl);
	}
}).then(function (response) {
	if (response) {
		return response.text();
	}
}).

/* Get latest signature data from CDN, with fallback logic
	in case node for current continent is offline */
then(function (continent) {
	function getSignature (newContinent) {
		WebSign.cdnUrl		=
			'https://' +
			newContinent +
			WebSign.config.cdnUrlBase +
			location.host +
			'/'
		;

		return new Promise((resolve, reject) {
			setTimeout(reject, 10000);

			fetch(
				WebSign.cdnUrl + WebSign.config.signaturePath + '?' + Date.now()
			).then(function (response) {
				resolve(response.text());
			});
		});
	}

	if (continent) {
		return getSignature(continent).catch(function () {
			return getSignature(WebSign.config.defaultContinent);
		});
	}
	else {
		return getSignature(WebSign.config.defaultContinent);
	}
}).

/* Process signature data */
then(function (s) {
	var signatureLines	= s.split('\n');

	var signatureData	= {
		signature: signatureLines[0],
		rsaKey: WebSign.config.publicKeys.rsa[parseInt(signatureLines[1], 10)],
		sphincsKey: WebSign.config.publicKeys.sphincs[parseInt(signatureLines[2], 10)],
		timestamp: parseInt(signatureLines[3], 10)
	};

	var packageUrl		=
		WebSign.cdnUrl + WebSign.config.packagePath + '?' + signatureData.timestamp
	;

	return Promise.all([
		signatureData,
		packageUrl,
		superSphincs.importKeys({
			public: {
				rsa: signatureData.rsaKey,
				sphincs: signatureData.sphincsKey
			}
		}),
		fetch(packageUrl).then(function (response) {
			return response.text();
		})
	]);
}).catch(function () {
	return [
		{
			signature: null,
			rsaKey: null,
			sphincsKey: null,
			timestamp: 0
		},
		'',
		{},
		'{}\n'
	];
}).

/* Validate signature */
then(function (results) {
	var signatureData	= results[0];
	var packageUrl		= results[1];
	var publicKey		= results[2].publicKey;
	var signed			= parseSigned(results[3]);

	/* Fall back to previous known good version if this one
		is older or has invalid metadata */
	if (
		!signatureData.rsaKey ||
		!signatureData.sphincsKey ||
		signed.metadata.timestamp !== signatureData.timestamp ||
		Date.now() > signed.metadata.expires ||
		parseInt(LocalStorage.webSignTimestamp, 10) > signed.metadata.timestamp
	) {
		throw 'Invalid data.';
	}

	return Promise.all([
		signed.metadata,
		packageUrl,
		superSphincs.verifyDetached(
			signatureData.signature,
			signed.complete,
			publicKey,
			true
		)
	]);
}).then(function (results) {
	var metadata	= results[0];
	var packageUrl	= results[1];
	var isValid		= results[2].isValid;
	var hash		= results[2].hash;

	if (!isValid) {
		throw 'Invalid signature.';
	}

	LocalStorage.webSignExpires			= metadata.expires;
	LocalStorage.webSignHashWhitelist	= JSON.stringify(metadata.hashWhitelist);
	LocalStorage.webSignTimestamp		= metadata.timestamp;
	LocalStorage.webSignPackageUrl		= packageUrl;
	LocalStorage.webSignPackageHash		= hash;

	return package;
}).

/* Invalid signature; attempt to grab previous
	known good package from cache */
catch(function () {
	if (
		!LocalStorage.webSignPackageUrl ||
		!LocalStorage.webSignPackageHash ||
		Date.now() > parseInt(LocalStorage.webSignExpires, 10)
	) {
		throw 'No fallback version.';
	}

	return new Promise((resolve, reject) {
		setTimeout(reject, 3000);

		fetch(LocalStorage.webSignPackageUrl).then(function (response) {
			resolve(response.text());
		});
	}).then(function (s) {
		var signed	= parseSigned(s);

		return Promise.all([
			signed.package,
			superSphincs.hash(signed.complete)
		]);
	}).then(function (results) {
		var package	= results[0];
		var hash	= results[1].hex;

		if (hash !== LocalStorage.webSignPackageHash) {
			throw 'Fallback hash mismatch.';
		}

		WebSign.cdnUrl	= LocalStorage.webSignPackageUrl.
			split('/').
			slice(0, 4).
			join('/') +
			'/'
		;

		return package;
	});
}).

/* Successfully execute package */
then(function (package) {
	if (!validateBootstrap()) {
		return;
	}

	try {
		document.open('text/html');
		document.write(package);
		document.close();
		WebSignSRI(WebSign.cdnUrl);
	}
	catch (_) {}
}).

/* Abort */
catch(function () {
	if (!validateBootstrap()) {
		return;
	}

	var preLoad			= document.getElementById('pre-load');
	var preLoadMessage	= document.getElementById('pre-load-message');

	while (true) {
		var child	= preLoad.children[0];

		if (child === preLoadMessage) {
			break;
		}
		else {
			preLoad.removeChild(child);
		}
	}

	preLoadMessage.innerText	= WebSign.config.abortText;
});



function parseSigned (s) {
	var divider	= s.indexOf('\n');

	return {
		complete: s,
		metadata: JSON.parse(s.slice(0, divider)),
		package: s.slice(divider + 1)
	};
}

function validateBootstrap () {
	try {
		var hashWhitelist	= JSON.parse(LocalStorage.webSignHashWhitelist);

		if (hashWhitelist[LocalStorage.webSignHash]) {
			return true;
		}
	}
	catch (_) {
		return true;
	}

	var preLoad			= document.getElementById('pre-load');
	var panicMessage	= document.getElementById('panic-message');

	while (true) {
		var child	= preLoad.children[0];

		if (child === panicMessage) {
			break;
		}
		else {
			preLoad.removeChild(child);
		}
	}

	panicMessage.style.display	= 'block';

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
					'\n\ncdn url: ' + WebSign.cdnUrl +
					'\n\ncurrent bootstrap hash: ' + LocalStorage.webSignHash +
					'\n\nprevious bootstrap hash: ' + LocalStorage.webSignHashOld +
					'\n\npackage hash: ' + LocalStorage.webSignPackageHash +
					'\n\n\n\n' + WebSign.bootstrapText
			}
		})
	});

	return false;
}


}());
