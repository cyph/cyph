/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

function webSignSRI (baseUrl) {
	new MutationObserver(function () {
		webSignSRI_Process(baseUrl);
	}).observe(document, {
		childList: true,
		attributes: false,
		characterData: false,
		subtree: true
	});

	return webSignSRI_Process(baseUrl);
}

function webSignSRI_Process (baseUrl) {
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

	return Promise.all(inputElements.map(function (elem, i) {
		var tagName			= elem.tagName.toLowerCase();
		var expectedHash	= getAndRemoveAttribute(elem, 'websign-sri-hash');
		var path			= getAndRemoveAttribute(elem, 'websign-sri-path');
		var isDataResource	= getAndRemoveAttribute(elem, 'websign-sri-data') !== null;

		var getContent		= function (retries) {
			return fetch(
				baseUrl +
				path.replace(/^\//, '') +
				'?' +
				expectedHash
			).then(function (response) {
				return response.text();
			}).catch(function (err) {
				if (retries < 5) {
					return getContent(retries + 1);
				}
				else {
					return Promise.reject(err);
				}
			});
		};

		return getContent(0).then(function (s) {
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
}
