#!/bin/bash

destinationProtocol="$(echo "${1}" | perl -pe 's/(.*?):\/\/.*/\1/')"
destinationURL="$(echo "${1}" | perl -pe 's/.*?:\/\/(.*)/\1/')"

if [ ! -f ~/.ssh/id_rsa_docker ] ; then
	ssh-keygen -t rsa -b 4096 -C 'gibson@docker' -P '' -f ~/.ssh/id_rsa_docker
	echo -e '\n\nGive this public key access to WordPress and then hit enter to continue:\n'
	cat ~/.ssh/id_rsa_docker.pub
	read
	sleep 30
fi

ssh -i ~/.ssh/id_rsa_docker -f -N -L 43000:localhost:43000 wordpress.internal.cyph.com > /dev/null 2>&1

downloadURL="$(node -e "
	const browser	= new (require('zombie'));

	new Promise(resolve => browser.visit(
		'http://localhost:43000/wp-admin/admin.php?page=simply-static_settings',
		resolve
	)).then(() => new Promise(resolve => browser.
		fill('log', 'admin').
		fill('pwd', 'hunter2').
		pressButton('Log In', resolve)
	)).then(() => new Promise(resolve => browser.
		select('destination_scheme', '${destinationProtocol}').
		fill('destination_host', '${destinationURL}').
		pressButton('Save Changes', resolve)
	)).then(() => new Promise(resolve => browser.visit(
		'http://localhost:43000/wp-admin/admin.php?page=simply-static',
		resolve
	))).then(() => new Promise(resolve => browser.
		pressButton('Generate Static Files', resolve)
	)).then(() => {
		const tryDownload	= () => setTimeout(() => {
			const a	= browser.document.querySelectorAll('a[href*=\".zip\"]')[0];

			if (a) {
				console.log(a.href);
				process.exit();
			}

			try {
				browser.pressButton('Resume', tryDownload);
			}
			catch (_) {
				tryDownload();
			}
		}, 5000);

		tryDownload();
	});
" | tail -n1)"

wget "${downloadURL}" -O wpstatic.zip
unzip wpstatic.zip

rm -rf wpstatic.zip wp-admin wp-json $(find . -name '*.php')
