/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

/* From PotassiumUtil */
function fromBlob (blob) {
	return new Promise(function (resolve, reject) {
		var reader	= new FileReader();
		if (reader._realReader) {
			reader	= reader._realReader;
		}

		reader.onerror	= reject;
		reader.onload	= function () {
			resolve(
				reader.result instanceof ArrayBuffer ?
					new Uint8Array(reader.result) :
					new Uint8Array(0)
			);
		};

		reader.readAsArrayBuffer(blob);
	});
}

function webSignSRI (packageMetadata) {
	new MutationObserver(function () {
		webSignSRI_Process(packageMetadata);
	}).observe(document, {
		childList: true,
		attributes: false,
		characterData: false,
		subtree: true
	});

	return webSignSRI_Process(packageMetadata);
}

function webSignSRI_Process (packageMetadata) {
	var outputIndex		= 0;
	var outputElements	= [];

	var inputElements	= Array.prototype.slice.apply(
		document.querySelectorAll(
			'[websign-sri-hash]' +
			'[websign-sri-path]' +
			':not([websign-sri-hash=""])' +
			':not([websign-sri-path=""])'
		)
	);

	function getAndRemoveAttribute (elem, attr) {
		var value	= elem.getAttribute(attr);
		var exists	= elem.hasAttribute(attr);

		elem.removeAttribute(attr);

		return exists ? value : null;
	}

	return localforage.ready().catch(function () {}).then(function () {
		return Promise.all(inputElements.map(function (elem, i) {
			var tagName			= elem.tagName.toLowerCase();
			var expectedHash	= getAndRemoveAttribute(elem, 'websign-sri-hash');
			var path			= getAndRemoveAttribute(elem, 'websign-sri-path');
			var isDataResource	= getAndRemoveAttribute(elem, 'websign-sri-data') !== null;
			var localStorageKey	= 'websign-sri-cache/' + expectedHash;

			if (!expectedHash || !path) {
				return;
			}

			return localforage.getItem(localStorageKey).then(function (content) {
				if (!content) {
					throw new Error('Content not in WebSign-SRI cache.');
				}

				return content;
			}).catch(function () {
				var ipfsHash	= packageMetadata.package.subresources[
					path.replace(/^\//, '')
				];

				if (!ipfsHash) {
					throw new Error('IPFS hash not found.');
				}

				var packageGatewayIndex	= 0;

				function fetchIPFSResource () {
					return fetch(
						packageMetadata.gateways[packageGatewayIndex].replace(
							':hash',
							ipfsHash
						)
					).then(function (response) {
						return response.blob();
					}).then(fromBlob).then(function (bytes) {
						var content	=
							superSphincs._sodiumUtil.to_string(
								BrotliDecode(bytes)
							).trim()
						;

						return Promise.all([
							content,
							superSphincs.hash(content)
						])
					}).then(function (results) {
						var content		= results[0];
						var actualHash	= results[1].hex;

						if (actualHash !== expectedHash) {
							throw new Error(
								'Invalid subresource ' + path + '.\n\n' +
								'Expected: ' +  expectedHash + '.\n\n' +
								'Received: ' + actualHash + '.'
							);
						}

						localforage.setItem(
							localStorageKey,
							content
						).catch(function () {});

						return content;
					});
				}

				return fetchIPFSResource().catch(function (err) {
					++packageGatewayIndex;

					if (packageMetadata.gateways.length > packageGatewayIndex) {
						return fetchIPFSResource();
					}
					else {
						throw err;
					}
				});
			}).then(function (content) {
				if (isDataResource) {
					elem.setAttribute(
						tagName === 'link' ?
							'href' :
							tagName === 'meta' ?
								'content' :
								'src'
						,
						content
					);

					outputElements[i]	= elem;
				}
				else {
					elem.parentElement.removeChild(elem);

					outputElements[i]	= document.createElement(
						tagName === 'script' ?
							'script' :
							'style'
					);

					outputElements[i].textContent	= content;
				}

				while (true) {
					var outputElement	= outputElements[outputIndex];

					if (!outputElement) {
						return;
					}

					if (!outputElement.parentElement) {
						document.head.appendChild(outputElement);
					}

					outputElements[outputIndex]	= null;
					++outputIndex;
				}
			});
		}));
	});
}
