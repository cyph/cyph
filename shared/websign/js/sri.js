/*
 * Cross-browser provider of subresource integrity inspired by
 * the upcoming Subresource Integrity standard.
 */

function WebSignSRI (baseUrl) {
	return Promise.all(
		Array.prototype.slice.apply(
			document.querySelectorAll('[websign-sri-hash]')
		).map(function (elem) {
			var tagName	= (elem.tagName || '').toLowercase();
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
					(path[0] === '/' ? path.slice(1) : path) +
					'?' + 
					hash
				).then(function (s) { return (s || '').trim() })
			]);
		}).filter(function (p) { return p })
	).then(function (results) {
		return Promise.all(results.map(function (result) {
			return Promise.all([
				result[0],
				result[1],
				result[2],
				superSphincs.hash(result[2])
			]);
		}));
	}).then(function (results) {
		return results.map(function (result) {
			return {
				tagName: result[0],
				expectedHash: result[1],
				content: result[2],
				actualHash: result[3]
			};
		});
	}).then(function (subresources) {
		for (var i = 0 ; i < subresources.length ; ++i) {
			var subresource	= subresources[i];

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
