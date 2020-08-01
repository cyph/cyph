/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

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
				var ipfsHash	= packageMetadata.package.subresources[path.replace(/^\//, '')];

				if (!ipfsHash) {
					throw new Error('IPFS hash not found.');
				}

				return fetchRetry(
					packageMetadata.gateway.replace(':hash', ipfsHash)
				).then(function (response) {
					return response.text();
				}).then(function (s) {
					var content	= s.trim();

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

					localforage.setItem(localStorageKey, content).catch(function () {});

					return content;
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
