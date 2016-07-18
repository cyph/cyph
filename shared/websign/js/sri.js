/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

function WebSignSRI (baseUrl) {
	var outputIndex		= 0;
	var outputElements	= [];

	var selector		=
		'[websign-sri-hash]' +
		'[websign-sri-path]' +
		':not([websign-sri-hash=""])' +
		':not([websign-sri-path=""])'
	;

	var inputElements	= Array.prototype.slice.apply(
		document.querySelectorAll(
			'script' + selector + ', ' +
			'link[rel="stylesheet"]' + selector
		)
	);


	return Promise.all(inputElements.map(function (elem, i) {
		var tagName			= elem.tagName.toLowerCase();
		var expectedHash	= elem.getAttribute('websign-sri-hash');
		var path			= elem.getAttribute('websign-sri-path');

		elem.parentElement.removeChild(elem);

		return fetch(
			baseUrl +
			path.replace(/^\//, '') +
			'?' +
			expectedHash
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
				throw 'Invalid subresource.\n\n' +
					'Expected: ' +  expectedHash + '.\n\n' +
					'Received: ' + actualHash + '.'
				;
			}

			outputElements[i]	= document.createElement(
				tagName === 'script' ?
					'script' :
					'style'
			);

			outputElements[i].textContent	= content;

			while (true) {
				var elem	= outputElements[outputIndex];

				if (!elem) {
					return;
				}

				outputElements[outputIndex]	= null;
				document.head.appendChild(elem);
				++outputIndex;
			}
		});
	}));
}
