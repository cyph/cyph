#!/bin/bash


getRoot=true
if [ "${1}" == '--no-root' ] ; then
	getRoot=''
	shift
fi

rootURL="${1}"
fullDestinationURL="${rootURL}/blog"
destinationProtocol="$(echo "${fullDestinationURL}" | perl -pe 's/(.*?:\/\/).*/\1/')"
destinationURL="$(echo "${fullDestinationURL}" | perl -pe 's/.*?:\/\/(.*)/\1/')"

sshServer='wordpress.internal.cyph.com'
sourcePort='43000'
sourceOrigin="localhost:${sourcePort}"
sourceURL="http://${sourceOrigin}"

log 'Generating static blog'

checklock () {
	ssh -i ~/.ssh/id_rsa_docker "${sshServer}" '
		find . -name "lock" -mmin +21 -mindepth 1 -maxdepth 1 -exec rm {} \; ;
		if [ -f lock ] ; then cat lock ; fi
	'
}

claimlock () {
	ssh -i ~/.ssh/id_rsa_docker "${sshServer}" "
		if [ ! -f lock ] ; then echo '${1}' > lock ; fi
	"
}

releaselock () {
	ssh -i ~/.ssh/id_rsa_docker "${sshServer}" '
		rm -f lock /var/www/html/wp-content/plugins/simply-static/static-files/*.zip
	'
}

sshkill () {
	ps ux |
		grep -P "ssh.*${sshServer}" |
		grep -v grep |
		awk '{print $2}' |
		xargs -r kill -9
}

while [ ! -f index.html ] ; do
	commandComment="# wpstatic-download $(node -e '
		console.log(crypto.randomBytes(32).toString("hex"))
	')"

	while [ "$(checklock)" != "${commandComment}" ] ; do
		if [ "$(checklock)" == "" ] ; then
			claimlock "${commandComment}"
		fi
		sleep 10
	done

	sshkill
	ssh -i ~/.ssh/id_rsa_docker -f -N -L "${sourcePort}:${sourceOrigin}" "${sshServer}" > /dev/null 2>&1

	command="$(node -e "
		const browser	= new (require('zombie'));

		setTimeout(() => process.exit(), 1200000);

		new Promise(resolve => browser.visit(
			'${sourceURL}/wp-admin/admin.php?page=simply-static_settings',
			resolve
		)).then(() => new Promise(resolve => browser.
			fill('log', 'admin').
			fill('pwd', 'hunter2').
			pressButton('Log In', resolve)
		)).then(() => new Promise(resolve => browser.
			select('destination_scheme', '${destinationProtocol}').
			fill('destination_host', '${destinationURL}').
			pressButton('Save Changes', resolve)
		)).then(() => {
			let hasInitiated	= false;

			const tryDownload	= () =>
				new Promise(resolve => browser.visit(
					'${sourceURL}/wp-admin/admin.php?page=simply-static',
					() => setTimeout(resolve, 5000)
				)).then(() => {
					if (!hasInitiated) {
						return;
					}

					const a	= browser.document.querySelectorAll(
						'a[href*=\".zip\"]'
					)[0];

					if (!a) {
						throw 'Not found.';
					}

					const command	=
						\`wget --header 'Cookie: \${browser.cookies.join('; ')}' \` +
						\`--tries=50 '\${a.href}' -O wpstatic.zip ${commandComment}\`
					;

					browser.tabs.closeAll();
					console.log(command);
					process.exit();
				}).then(() => new Promise(resolve =>
					!browser.document.querySelectorAll('#generate:not(.hide)')[0] ?
						resolve() :
						browser.pressButton(
							'Generate Static Files',
							() => setTimeout(() => {
								hasInitiated	= true;
								resolve();
							}, 5000)
						)
				)).
				catch(() => {}).
				then(() => new Promise(resolve =>
					!browser.document.querySelectorAll('#resume:not(.hide)')[0] ?
						resolve() :
						browser.pressButton(
							'Resume',
							() => setTimeout(resolve, 5000)
						)
				)).
				catch(() => {}).
				then(() =>
					setTimeout(tryDownload, 10000)
				)
			;

			tryDownload();
		});
	" 2> /dev/null | tail -n1)"

	if [ "$(echo "${command}" | grep "${commandComment}")" ] ; then
		log "${command}"
		eval "${command}"
	fi

	releaselock

	if [ ! -f wpstatic.zip ] ; then
		continue
	fi

	mkdir tmp
	unzip wpstatic.zip -d tmp

	if [ -f tmp/index.html ] ; then
		mv tmp/* ./
	fi

	rm -rf tmp wpstatic.zip
done

rm -rf wp-admin wp-json $(find . -name '*.php')

for f in $(find . -type f) ; do
	cat "${f}" |
		sed 's|–|—|g' |
		sed 's|&ndash;|\&mdash;|g' |
		sed 's|&#8211;|\&mdash;|g' |
		sed 's|&#x2013;|\&mdash;|g' \
	> "${f}.new"

	mv "${f}.new" "${f}"
done

mkdir css fonts img js

for f in $(find . -name '*.html') ; do node -e "
	const cheerio		= require('cheerio');
	const htmlMinifier	= require('html-minifier');
	const imageType		= require('image-type');
	const superSphincs	= require('supersphincs');

	const fetch	= (url, opts) =>
		require('node-fetch')(url, opts).catch(() => fetch(url, opts))
	;

	const \$	= cheerio.load(fs.readFileSync('${f}').toString());

	\$('meta[name=\"twitter:card\"]').each((i, elem) =>
		\$(elem).attr('content', 'summary_large_image')
	);

	Promise.all(
		\$(
			'script:not([src]), style'
		).toArray().map(elem => Promise.resolve().then(() => {
			elem	= \$(elem);

			const content	= elem.text().trim();
			const isScript	= elem.prop('tagName').toLowerCase() === 'script';

			elem.text('');

			return superSphincs.hash(content).then(hash => {
				let path;

				if (isScript) {
					path	= \`js/\${hash.hex}.js\`;
					elem.attr('src', \`/blog/\${path}\`);
				}
				else {
					path	= \`css/\${hash.hex}.css\`;
					elem.replaceWith(\`
						<link
							rel='stylesheet'
							href='/blog/\${path}'
						></link>
					\`);
				}

				fs.writeFileSync(path, content);
			});
		})).concat(\$(
			'img[src]:not([src^=\"/blog\"]):not([src^=\"${fullDestinationURL}\"]), ' +
			'script[src]:not([src^=\"/blog\"]):not([src^=\"${fullDestinationURL}\"]), ' +
			'link[rel=\"stylesheet\"][href]:not([href^=\"/blog\"]):not([href^=\"${fullDestinationURL}\"])'
		).toArray().concat(
			/* Workaround for Supsystic table plugin dynamically generating this client-side */
			\$('<link href=\"https://fonts.googleapis.com/css?family=Ubuntu\" />')
		).map(elem => Promise.resolve().then(() => {
			elem	= \$(elem);

			const tagName	= elem.prop('tagName').toLowerCase();
			const attr		= tagName === 'link' ? 'href' : 'src';
			const url		= elem.attr(attr).replace(/^\/\//, 'https://');

			return fetch(
				url,
				{headers: {'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)'}}
			).then(res =>
				res.buffer()
			).then(content => Promise.all([
				content,
				superSphincs.hash(content)
			])).then(results => {
				const content		= results[0];
				const hash			= results[1].hex;

				const path		=
					tagName === 'script' ? \`js/\${hash}.js\` :
					tagName === 'link' ? \`css/\${hash}.css\` :
					\`img/\${hash}.\${(imageType(content) || {ext: 'jpg'}).ext}\`
				;

				elem.attr(attr, \`/blog/\${path}\`);
				fs.writeFileSync(path, content);
			});
		})))
	).then(() =>\$('head').append(\`
		<script defer src='/assets/node_modules/core-js/client/shim.js'></script>
		<script defer src='/assets/js/standalone/global.js'></script>
		<script defer src='/assets/js/standalone/analytics.js'></script>
	\`)).then(() => fs.writeFileSync('${f}', htmlMinifier.minify(
		\$.html().trim(),
		{
			collapseWhitespace: true,
			removeComments: true
		}
	)));
" ; done

sed -i "s|https://fonts.googleapis.com/css|${fullDestinationURL}/$(grep -rl 'local(.Ubuntu.)')|g" \
	wp-content/plugins/pricing-table-by-supsystic/js/table.min.js

grep -rl "'//' + disqus_shortname" |
	xargs -I% sed -i "s|'//' + disqus_shortname|'/blog/js/' + disqus_shortname|g" %

for id in cyph cyphtest ; do
	mkdir js/${id}.disqus.com
	for script in count embed ; do
		wget --tries=50 https://${id}.disqus.com/${script}.js -O js/${id}.disqus.com/${script}.js
	done
done

mkdir -p js/platform.twitter.com/js
wget --tries=50 https://platform.twitter.com/jot.html -O js/platform.twitter.com/jot.html
for f in $(grep -rl https://platform.twitter.com) ; do
	node -e "
		const s	= '$(grep -oP '\{[a-z0-9_,:"]+button".*?\}.*?\{.*?\}' ${f})'.
			replace(/(\\d+):/g, '\"\$1\":')
		;

		const a	= JSON.parse(s.split('}')[0] + '}');
		const b	= JSON.parse('{' + s.split('{').slice(-1)[0]);

		for (let k of Object.keys(a)) {
			console.log(\`\${a[k]}.\${b[k]}.js\`);
		}
	" |
		xargs -I% wget --tries=50 "https://platform.twitter.com/js/%" -O "js/platform.twitter.com/js/%"

	sed -i 's|https://platform.twitter.com|/blog/js/platform.twitter.com|g' ${f}
done

cd css
ls | xargs -I% sed -i "s|\.\./fonts|${sourceURL}/wp-content/themes/cedar/assets/fonts|g" %
for type in eot svg ttf woff woff2 ; do
	grep -r "\.${type}" |
		grep -oP "(http)?(s)?(:)?//[A-Za-z0-9\./:?=_-]*?\.${type}" |
		sort |
		uniq |
		xargs -I% bash -c "
			url=\"\$(echo '%' | sed 's|${fullDestinationURL}|${sourceURL}|g')\";
			path=\"fonts/\$(node -e \" \
				require('supersphincs').hash('%').then(hash => console.log(hash.hex)) \
			\").${type}\";
			wget --tries=50 \"\${url}\" -O \"../\${path}\";
			grep -rl '%' | xargs -I{} sed -i \"s|%|/blog/\${path}|g\" {};
		"
done
cd ..

for path in $(
	grep -hroP "${fullDestinationURL}([A-Za-z0-9]|/|-|_)+\.(jpg|jpeg|png|gif|webp|svg)" |
		sed "s|${fullDestinationURL}/||g" |
		sort |
		uniq
) ; do
	parent="$(echo "${path}" | perl -pe 's/\/[^\/]+$//')"
	mkdir -p "${parent}"
	wget --tries=50 "${sourceURL}/${path}" -O "${path}.new"
	mv "${path}.new" "${path}" 2> /dev/null
done

rm root/index.html
grep -rl /blog/root root | xargs -I% sed -i 's|/blog/root||g' %

# One-off edge cases; should find a better general solution later
for page in checkout contact ; do
	grep -rl /blog/${page} root | xargs -I% sed -i "s|/blog/${page}|/${page}|g" %
done
{ grep -rlP '/blog/?"' root; echo index.html; } | xargs -I% sed -i 's|/blog/*"|/"|g' %

if [ "${getRoot}" ] ; then
	yamlFile="../.build.yaml"
	if [ ! -f "${yamlFile}" ] ; then
		yamlFile="$(ls ../*.yaml)"
	fi

	yaml="$(cat ../*.yaml | tr '\n' '\r')"
	wpstaticYaml="$(echo "${yaml}" | grep -oP '# WPSTATIC.*?\r\r')"

	for path in blog $(ls root) ; do
		yaml="${yaml//"${wpstaticYaml}"/"${wpstaticYaml}${wpstaticYaml//PATH/"${path}"}"}"
	done

	echo "${yaml//"${wpstaticYaml}"/}" | tr '\r' '\n' > ../*.yaml
	mv root/* ../
	rmdir root
else
	rm -rf root
fi

sshkill
