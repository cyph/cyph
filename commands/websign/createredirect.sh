#!/bin/bash

path="${1}"
domain="${2}"
package="${3}"
test="${4}"

cat > "${domain}/index.html.tmp" <<- EOM
	<html☁manifest='/appcache.appcache'>
		<body>
			<script>
				try {
					navigator.serviceWorker.
						register('/serviceworker.js').
						catch(function () {})
					;
				}
				catch (_) {}
				try {
					navigator.storage.persist();
				}
				catch (_) {}

				var☁storage	= {};
				try {
					localStorage.isPersistent	= 'true';
					storage						= localStorage;
				}
				catch (_) {}

				var☁isHiddenService	= location.host.split('.').slice(-1)[0] === 'onion';

				$(if [ ! "${test}" ] ; then echo "
					if (location.host.indexOf('www.') === 0) {
						location.host	= location.host.replace('www.', '');
					}
					else☁if (
						!isHiddenService &&
						storage.isPersistent &&
						!storage.webSignWWWPinned
					) {
						storage.webSignWWWPinned	= true;
						location.host				= 'www.' + location.host;
					}
				" ; fi)

				var☁path	= (
					'/#' +
					'$(if [ "${path}" ] ; then echo "${path}/" ; fi)' +
					location.toString().
						split(location.host)[1].
						replace('#', '').
						replace(/^\\//, '')
				).replace(/\\/\$/, '');

				var☁host	= '${package}';

				if (isHiddenService) {
					host	=
						host.replace(/\\.ws\$/, '').replace(/\\./g, '_') +
						'.cyphdbyhiddenbhs.onion'
					;
				}

				location	= 'https://' + host + (path === '/#' ? '' : path);
			</script>
		</body>
	</html>
EOM

cat > "${domain}/appcache.appcache" <<- EOM
	CACHE MANIFEST

	CACHE:
	/
	/appcache.appcache
	/serviceworker.js

	NETWORK:
	*
EOM

cat > "${domain}/serviceworker.js" <<- EOM
	var files	= [
		'/',
		'/appcache.appcache',
		'/serviceworker.js'
	].map(function (file) {
		return new Request(file);
	});

	var root	= files[0].url.replace(/(.*)\\/\$/, '\$1');

	self.addEventListener('install', function () {
		Promise.all([
			caches.open('cache'),
			Promise.all(files.map(function (file) {
				return fetch(file, {credentials: 'include'});
			}))
		]).then(function (results) {
			var cache		= results[0];
			var responses	= results[1];

			for (var i = 0 ; i < responses.length ; ++i) {
				cache.put(files[i], responses[i]);
			}
		});
	});

	self.addEventListener('fetch', function (e) {
		/* Let requests to other origins pass through */
		if (e.request.url.indexOf(root) !== 0) {
			return;
		}

		return e.respondWith(
			caches.match(e.request).then(function (cachedResponse) {
				if (cachedResponse) {
					return cachedResponse;
				}

				return Promise.all([
					caches.open('cache'),
					fetch(e.request.clone())
				]).then(function (results) {
					var cache		= results[0];
					var response	= results[1];

					cache.put(e.request, response.clone());

					return response;
				});
			})
		);
	});
EOM

echo -n '<!DOCTYPE html>' > "${domain}/index.html"
cat "${domain}/index.html.tmp" | perl -pe 's/\s+//g' | tr '☁' ' ' >> "${domain}/index.html"
rm "${domain}/index.html.tmp"
