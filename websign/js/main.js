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
var locationString	= location.toString();

var packageName		=
	!isHiddenService ?
		location.host :
	hostSplit[0] === 'app' ?
		'cyph.app' :
		hostSplit[0].replace(/_/g, '.')
;

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

var oldPackageContainer	= {};
try {
	oldPackageContainer	= proto.WebSignPackageContainer.decode(
		superSphincs._sodiumUtil.from_base64(
			storage.webSignPackageContainer
		)
	);
}
catch (_) {}

/* Get package */
Promise.resolve().then(function () {
	function getPackage () {
		return fetchRetry(
			config.packageURL + packageName,
			undefined,
			'arrayBuffer',
			45000
		).then(function (buffer) {
			var packageContainer	= proto.WebSignPackageContainer.decode(
				new Uint8Array(buffer)
			);

			if (
				isNaN(packageContainer.timestamp) ||
				oldPackageContainer.timestamp > packageContainer.timestamp
			) {
				throw new Error('Outdated package.');
			}

			return packageContainer;
		});
	}

	if (isNaN(oldPackageContainer.timestamp)) {
		return getPackage();
	}

	return fetchRetry(
		config.packageTimestampURL + packageName,
		undefined,
		undefined,
		15000
	).then(function (s) {
		var timestamp	= parseInt(s, 10);

		return timestamp > oldPackageContainer.timestamp ?
			getPackage() :
			oldPackageContainer
		;
	});
}).catch(function () {
	return oldPackageContainer;
}).

/* Open package */
then(function (packageContainer) {
	var certifiedMessage	= proto.AGSEPKICertified.decode(
		BrotliDecode(packageContainer.data)
	);

	if (certifiedMessage.algorithm !== config.algorithm) {
		throw new Error('Invalid signing algorithm.');
	}

	var publicKeys			= {
		classical: config.publicKeys.classical[
			certifiedMessage.publicKeys.classical
		],
		postQuantum: config.publicKeys.postQuantum[
			certifiedMessage.publicKeys.postQuantum
		]
	};

	if (!publicKeys.classical || !publicKeys.postQuantum) {
		throw new Error('No valid public key specified.');
	}

	return Promise.all([
		packageContainer,
		certifiedMessage.data,
		superSphincs.importKeys({
			public: publicKeys
		})
	]);
}).then(function (results) {
	var packageContainer	= results[0];
	var signed				= results[1];
	var publicKey			= results[2].publicKey;

	return Promise.all([
		packageContainer,
		superSphincs.open(
			signed,
			publicKey,
			config.additionalDataPackagePrefix + packageName
		)
	]);
}).then(function (results) {
	var packageContainer	= results[0];
	var opened				= proto.WebSignPackage.decode(results[1]);

	/* Reject if expired or has invalid timestamp */
	if (
		opened.packageData.algorithm !== config.algorithm ||
		Date.now() > opened.packageData.expirationTimestamp ||
		packageContainer.timestamp !== opened.packageData.timestamp ||
		(
			packageName !== opened.packageData.packageName &&
			packageName !== opened.packageData.packageName.replace(/\.(app|ws)$/, '')
		)
	) {
		throw new Error('Stale or invalid data.');
	}

	storage.webSignExpires			= opened.packageData.expirationTimestamp;
	storage.webSignHashWhitelist	= JSON.stringify(opened.hashWhitelist);
	storage.webSignPackageContainer	= superSphincs._sodiumUtil.to_base64(
		proto.WebSignPackageContainer.encode(
			packageContainer
		)
	);
	storage.webSignPackageName		= opened.packageData.packageName;
	storage.webSignPackageTimestamp	= opened.packageData.timestamp;

	var webSignKeyPersistenceTOFU	=
		opened.packageData.keyPersistence === proto.WebSignKeyPersistence.TOFU
	;
	if (webSignKeyPersistenceTOFU) {
		storage.webSignKeyPersistenceTOFU	= true;
	}
	else {
		webSignKeyPersistenceTOFU			= storage.webSignKeyPersistenceTOFU === 'true';
	}

	var secondarySignaturesValidPromise	= Promise.all(
		opened.signatures.map(function (packageSignature) {
			var publicKey	= packageSignature.publicKey;
			
			if (webSignKeyPersistenceTOFU) {
				var publicKeyStorageKey	= 'webSignPublicKey_' + packageSignature.username;

				publicKey	= superSphincs._sodiumUtil.from_base64(
					storage[publicKeyStorageKey]
				);

				if (!publicKey || publicKey.length < 1) {
					publicKey						= packageSignature.publicKey;
					storage[publicKeyStorageKey]	= superSphincs._sodiumUtil.to_base64(
						publicKey
					);
				}
			}

			return superSphincs.verifyDetached(
				packageSignature.signature,
				opened.packageData.payload,
				publicKey,
				config.additionalDataSignaturePrefix + packageName
			).then(function (secondarySignatureIsValid) {
				if (!secondarySignatureIsValid) {
					throw new Error(
						'Invalid secondary signature: @' + packageSignature.username
					);
				}
			});
		})
	);

	return Promise.all([
		opened.packageData,
		packageContainer,
		secondarySignaturesValidPromise
	]);
}).

/* Before finishing, perform self-administered
	integrity check on WebSign bootstrap */
catch(function () {
	return null;
}).then(function (o) {
	return Promise.all([
		o,
		Promise.all(config.files.map(function (file) {
			return fetchRetry(file).catch(function () {
				return '';
			});
		}))
	]);
}).then(function (results) {
	var o				= results[0];
	var fileContents	= results[1];

	var bootstrapText	= config.files.
		map(function (file, i) {
			return file + ':\n\n' + fileContents[i].trim();
		}).
		join('\n\n\n\n\n\n')
	;

	return Promise.all([
		o,
		bootstrapText,
		superSphincs.hash(bootstrapText)
	]);
}).then(function (results) {
	var o				= results[0];
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
	else if (o) {
		return o;
	}

	throw null;
}).

/* Successfully execute package */
then(function (o) {
	document.head.innerHTML	= o.packageData.payload.split('<head>')[1].split('</head>')[0];
	document.body.innerHTML	= o.packageData.payload.split('<body>')[1].split('</body>')[0];

	webSignSRI(o.packageContainer).catch(function (err) {
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
						locationString.replace(/\/#.*/g, '') + '\n\n' +
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
