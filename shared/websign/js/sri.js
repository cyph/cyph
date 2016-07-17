/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

function WebSignSRI (baseUrl) {
	var promises	= Array.prototype.slice.apply(
		document.querySelectorAll('[websign-sri-hash]')
	).map(function (elem) {
		var tagName	= (elem.tagName || '').toLowerCase();
		var hash	= elem.getAttribute('websign-sri-hash');
		var path	= elem.getAttribute('websign-sri-path');

		if (
			!(
				tagName === 'script' ||
				(tagName === 'link' && elem.rel === 'stylesheet')
			) ||
			!hash ||
			!path
		) {
			return;
		}

		elem.parentElement.removeChild(elem);

		return Promise.all([
			tagName,
			hash,
			fetch(
				baseUrl +
				path.replace(/^\//, '') +
				'?' +
				hash
			).then(function (response) {
				return response.text();
			}).then(function (s) {
				return s.trim();
			})
		]).then(function (results) {
			return {
				tagName: results[0],
				expectedHash: results[1],
				content: results[2]
			};
		});
	}).filter(function (promise) {
		return promise;
	});

	function loadSubresource (i) {
		var promise	= promises[i];

		if (!promise) {
			return;
		}

		return promise.then(function (subresource) {
			return Promise.all([
				subresource,
				superSphincs.hash(subresource.content)
			]);
		}).then(function (results) {
			var subresource	= results[0];
			var actualHash	= results[1].hex;

			if (actualHash !== subresource.expectedHash) {
				throw 'Invalid subresource.\n\n' +
					'Expected: ' +  subresource.expectedHash + '.\n\n' +
					'Received: ' + actualHash + '.'
				;
			}

			var elem	= document.createElement(
				subresource.tagName === 'script' ?
					'script' :
					'style'
			);

			elem.textContent	= subresource.content;

			document.head.appendChild(elem);

			return loadSubresource(i + 1);
		});
	}

	return loadSubresource(0);
}
