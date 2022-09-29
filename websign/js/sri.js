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

	var inputItems	= inputElements.map(function (elem) {
		var tagName			= elem.tagName.toLowerCase();
		var expectedHash	= getAndRemoveAttribute(elem, 'websign-sri-hash');
		var path			= getAndRemoveAttribute(elem, 'websign-sri-path');
		var isDataResource	= getAndRemoveAttribute(elem, 'websign-sri-data') !== null;
		var localStorageKey	= 'websign-sri-cache/' + expectedHash;

		if (!expectedHash || !path) {
			return;
		}

		return {
			elem: elem,
			expectedHash: expectedHash,
			isDataResource: isDataResource,
			localStorageKey: localStorageKey,
			path: path,
			tagName: tagName
		};
	}).filter(function (o) {
		return o !== undefined;
	});

	var localValuesPromise	= webSignStorage.bulkGet(inputItems.map(function (inputItem) {
		return inputItem.localStorageKey;
	})).catch(function () {
		return [];
	});

	var newLocalValues		= [];

	return Promise.all(inputItems.map(function (inputItem, i) {
		var elem			= inputItem.elem;
		var expectedHash	= inputItem.expectedHash;
		var isDataResource	= inputItem.isDataResource;
		var localStorageKey	= inputItem.localStorageKey;
		var path			= inputItem.path;
		var tagName			= inputItem.tagName;

		return localValuesPromise.then(function (localValues) {
			var content	= (localValues[i] || {}).value;

			if (!content) {
				throw new Error('Content not in WebSign-SRI cache.');
			}

			return content;
		}).catch(function () {
			var subresource	= path.replace(/^\//, '');
			var ipfsHash	= packageMetadata.package.subresources[subresource];
			var timeout		=
				(packageMetadata.package.subresourceTimeouts || {})[subresource] ||
				60000
			;

			if (!ipfsHash) {
				throw new Error('IPFS hash not found.');
			}

			var packageGatewayIndex	= -1;

			function fetchIPFSResource () {
				return fetchWithTimeout(
					packageGatewayIndex < 0 ?
						'ipfs://' + ipfsHash :
						packageMetadata.gateways[packageGatewayIndex].replace(
							':hash',
							ipfsHash
						)
					,
					undefined,
					'blob',
					timeout
				).then(fromBlob).then(function (bytes) {
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

					newLocalValues.push({
						key: localStorageKey,
						value: content
					});

					return content;
				}).catch(function (err) {
					++packageGatewayIndex;

					if (packageMetadata.gateways.length > packageGatewayIndex) {
						return fetchIPFSResource();
					}
					else {
						throw err;
					}
				});
			}

			return fetchIPFSResource();
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
	})).then(function () {
		if (newLocalValues.length < 1) {
			return;
		}

		return webSignStorage.bulkPut(newLocalValues).catch(function () {});
	});
}
