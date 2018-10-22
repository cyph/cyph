#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"
cd -

sshServer='wordpress.internal.cyph.com'
if [ "${1}" != '--prod' ] ; then
	sshServer="staging.${sshServer}"
	shift
fi

rootURL="${1}"
escapedRootURL="$(echo "${rootURL}" | sed 's|/|\\/|g')"
fullDestinationURL="${rootURL}/static_wordpress"
destinationProtocol="$(echo "${fullDestinationURL}" | perl -pe 's/(.*?:\/\/).*/\1/')"
destinationURL="$(echo "${fullDestinationURL}" | perl -pe 's/.*?:\/\/(.*)/\1/')"

sourcePort='43000'
sourceOrigin="localhost:${sourcePort}"
sourceURL="http://${sourceOrigin}"

log 'Generating static WordPress site'

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
	ssh -i ~/.ssh/id_rsa_docker -f -N -L "${sourcePort}:${sourceOrigin}" "${sshServer}" &> /dev/null

	command="$(node -e "(async () => {
		const browser	= await require('puppeteer').launch();
		const page		= await browser.newPage();

		setTimeout(() => process.exit(1), 600000);

		await page.goto('${sourceURL}/wp-admin/admin.php?page=simply-static_settings');

		await page.waitForSelector('#user_login');
		await page.type('#user_login', 'admin');
		await page.type('#user_pass', 'hunter2');
		await page.keyboard.press('Enter');
		await page.waitForNavigation();

		await page.waitForSelector('#destinationScheme');
		await page.select('#destinationScheme', '${destinationProtocol}');
		await page.click('#destinationHost');
		await Promise.all([
			page.keyboard.press('Control'),
			page.keyboard.press('KeyA')
		]);
		await page.type('#destinationHost', '${destinationURL}');
		await page.keyboard.press('Enter');
		await page.waitForNavigation();

		await page.goto('${sourceURL}/wp-admin/admin.php?page=simply-static');

		while (true) {
			await page.waitForSelector('#cancel');
			await page.click('#cancel').catch(() => {});
			await page.waitForSelector('#generate');
			await page.click('#generate');
			await page.waitForSelector('#cancel:not(.hide)');
			await page.waitForSelector('#generate:not(.hide)', {timeout: 3600000});

			const url		= await page.evaluate(() =>
				(document.querySelectorAll('a[href*=\".zip\"]')[0] || {}).href
			);

			if (!url) {
				await page.reload();
				continue;
			}

			const cookies	=
				(await page.cookies()).map(o => \`\${o.name}=\${o.value}\`).join('; ')
			;

			console.log(
				\`wget --header 'Cookie: \${cookies}' \` +
				\`--tries=50 '\${url}' -O wpstatic.zip ${commandComment}\`
			);

			await browser.close();
			process.exit();			
		}
	})().catch(() => process.exit(1))" 2> /dev/null | tail -n1)"

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

for f in $(find . -name '*.html') ; do node -e "(async () => {
	const cheerio		= require('cheerio');
	const htmlMinifier	= require('html-minifier');
	const imageType		= require('image-type');
	const superSphincs	= require('supersphincs');

	const fetch	= (url, opts) =>
		require('node-fetch')(url, opts).catch(() => fetch(url, opts))
	;

	const isAmp	= '${f}'.endsWith('/amp/index.html');

	const \$	= cheerio.load(fs.readFileSync('${f}').toString());

	\$('meta[name=\"twitter:card\"]').each((i, elem) =>
		\$(elem).attr('content', 'summary_large_image')
	);

	await Promise.all(
		\$(
			'script:not([src]), style'
		).toArray().map(async elem => {
			if (isAmp) {
				return;
			}

			elem	= \$(elem);

			const content	= elem.html().trim();
			const hash		= (await superSphincs.hash(content)).hex;
			const isScript	= elem.prop('tagName').toLowerCase() === 'script';

			elem.html('');

			let path;

			if (isScript) {
				path	= \`js/\${hash}.js\`;
				elem.attr('src', \`/static_wordpress/\${path}\`);
			}
			else if (!content) {
				return;
			}
			else {
				path	= \`css/\${hash}.css\`;
				elem.replaceWith(\`
					<link
						rel='stylesheet'
						href='/static_wordpress/\${path}'
					></link>
				\`);
			}

			fs.writeFileSync(path, content);
		}).concat(\$(
			'amp-img[src]:not([src^=\"/static_wordpress\"]):not([src^=\"${fullDestinationURL}\"]), ' +
			'img[src]:not([src^=\"/static_wordpress\"]):not([src^=\"${fullDestinationURL}\"]), ' +
			'script[src]:not([src^=\"/static_wordpress\"]):not([src^=\"${fullDestinationURL}\"]), ' +
			'link[rel=\"stylesheet\"][href]:not([href^=\"/static_wordpress\"]):not([href^=\"${fullDestinationURL}\"])'
		).toArray().concat(
			/* Workaround for Supsystic table plugin dynamically generating this client-side */
			\$('<link href=\"https://fonts.googleapis.com/css?family=Ubuntu\" />')
		).map(async elem => {
			elem	= \$(elem);

			const tagName	= elem.prop('tagName').toLowerCase();
			const attr		= tagName === 'link' ? 'href' : 'src';
			const url		= elem.attr(attr).replace(/^\/\//, 'https://');

			if (isAmp && (!tagName.endsWith('img') || url.startsWith('data:'))) {
				return;
			}

			const content	= await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)'
				}
			}).then(res =>
				res.buffer()
			);

			const hash		= (await superSphincs.hash(content)).hex;

			const path		=
				tagName === 'script' ? \`js/\${hash}.js\` :
				tagName === 'link' ? \`css/\${hash}.css\` :
				\`img/\${hash}.\${(imageType(content) || {ext: 'jpg'}).ext}\`
			;

			elem.attr(attr, \`/\${path}\`);
			elem.removeAttr('srcset');
			fs.writeFileSync(path, content);
		}))
	);

	if (isAmp) {
		return;
	}

	\$('head').append(\`
		<script defer src='/spa/assets/node_modules/core-js/client/shim.js'></script>
		<script defer src='/spa/assets/js/standalone/global.js'></script>
		<script defer src='/spa/assets/js/standalone/analytics.js'></script>
	\`);

	fs.writeFileSync('${f}', htmlMinifier.minify(
		\$.html().trim(),
		{
			collapseWhitespace: true,
			removeComments: true
		}
	));
})().catch(err => {
	console.error(err);
	process.exit(1);
})" ; done

if [ -f wp-content/plugins/pricing-table-by-supsystic/js/table.min.js ] ; then
	sed -i "s|https://fonts.googleapis.com/css|${fullDestinationURL}/$(grep -rl 'local(.Ubuntu.)')|g" \
		wp-content/plugins/pricing-table-by-supsystic/js/table.min.js
fi

# Workaround for silly hack in Zephyr that violates CSP
for f in $(find . -type f -name us.core.min.js) ; do
	cat "${f}" | perl -pe "s/([^=,]+)\.onclick\(\)(\|\|\{\})?/\1.getAttribute('onclick')?JSON.parse(\1.getAttribute('onclick').split('return')[1].trim()):{}/g" > "${f}.new"
	mv "${f}.new" "${f}"
done

grep -rl "'//' + disqus_shortname" |
	xargs -I% sed -i "s|'//' + disqus_shortname|'/js/' + disqus_shortname|g" %

for id in cyph cyphtest ; do
	mkdir js/${id}.disqus.com
	for script in count embed ; do
		download https://${id}.disqus.com/${script}.js js/${id}.disqus.com/${script}.js
	done
done

mkdir -p js/platform.twitter.com/js
download https://platform.twitter.com/jot.html js/platform.twitter.com/jot.html
for f in $(grep -rl https://platform.twitter.com) ; do
	node -e "
		const s	= '$(grep -oP '\{[a-z0-9_,:"]+button".*?\}.*?\{.*?\}' ${f})'.
			replace(/(\\d+):/g, '\"\$1\":')
		;

		try {
			const a	= JSON.parse(s.split('}')[0] + '}');
			const b	= JSON.parse('{' + s.split('{').slice(-1)[0]);

			for (let k of Object.keys(a)) {
				console.log(\`\${a[k]}.\${b[k]}.js\`);
			}
		}
		catch {
			console.error('FAILED TO PARSE: ' + s);
		}
	" |
		xargs -I% bash -c 'download "https://platform.twitter.com/js/%" "js/platform.twitter.com/js/%"'

	sed -i 's|https://platform.twitter.com|/js/platform.twitter.com|g' ${f}
done

for f in $(find . -type f -name '*.css') ; do
	sed -i "s|\.\./fonts|${sourceURL}/wp-content/themes/Zephyr/framework/fonts|g" "${f}"

	for type in eot svg ttf woff2 woff ; do
		grep "\.${type}" "${f}" |
			grep -oP "(http)?(s)?(:)?//[A-Za-z0-9\./:?=_-]*?\.${type}" |
			sort |
			uniq |
			xargs -I% bash -c "
				url=\"\$(echo '%' | sed 's|${fullDestinationURL}|${sourceURL}|g')\";
				path=\"fonts/\$(node -e \"(async () => { \
					console.log((await require('supersphincs').hash('%')).hex); \
				})().catch(err => {
					console.error(err);
					process.exit(1);
				})\").${type}\";
				download \"\${url}\" \"\${path}\";
				grep -rl '%' | xargs -I{} sed -i \"s|%|/\${path}|g\" {};
			"
	done
done

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

find . -type f -name logo-amp.png -exec cp -f "${dir}/shared/assets/img/logo.amp.png" "{}" \;

rm -rf blog/amp
find . -type d -name amp -not -path './blog/*' -exec rm -rf '{}' \; 2> /dev/null
grep -rl http://localhost:42001 . | xargs -I% sed -i 's|http://localhost:42001||g' %

for f in $(find . -type f -name '*.html') ; do
	cat "${f}" | perl -pe "s/\"${escapedRootURL}\/([^\"]*)\?/\"\/\1\?/g" > "${f}.new"
	mv "${f}.new" "${f}"
done

for f in $(grep -rl static_wordpress) ; do
	sed -i 's|static_wordpress/||g' ${f}
	sed -i 's|/static_wordpress||g' ${f}
	sed -i 's|static_wordpress||g' ${f}
done

sshkill
