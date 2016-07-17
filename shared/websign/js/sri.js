/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

function WebSignSRI (baseUrl) {
	return Promise.all(
		Array.prototype.slice.apply(
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

			var contentPromise	= fetch(
				baseUrl +
				path.replace(/^\//, '') +
				'?' +
				hash
			).then(function (response) {
				return response.text();
			}).then(function (s) {
				return s.trim();
			});

			var hashPromise		= contentPromise.then(function (s) {
				return superSphincs.hash(s);
			}).then(function (hash) {
				return hash.hex;
			});

			elem.parentElement.removeChild(elem);

			return Promise.all([
				tagName,
				hash,
				contentPromise,
				hashPromise
			]);
		}).filter(function (p) { return p })
	).then(function (results) {
		for (var i = 0 ; i < results.length ; ++i) {
			var subresource	= {
				tagName: results[i][0],
				expectedHash: results[i][1],
				content: results[i][2],
				actualHash: results[i][3]
			};

			if (subresource.actualHash !== subresource.expectedHash) {
				continue;
			}

			var elem	= document.createElement(
				subresource.tagName === 'script' ?
					'script' :
					'style'
			);

			elem.textContent	= subresource.content;

			document.head.appendChild(elem);
		}
	});
}
