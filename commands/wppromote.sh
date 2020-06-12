#!/bin/bash


cd "$(mktemp -d)"


localPort='43000'
localOrigin="localhost:${localPort}"
localURL="http://${localOrigin}"
sshBase='wordpress.internal.cyph.com'
sshSource="staging.${sshBase}"
sshTarget="${sshBase}"

if [ "${1}" == '--rollback' ] ; then
	sshTarget="${sshSource}"
	sshSource="${sshBase}"
fi

sshkill () {
	ps ux |
		grep -P "ssh.*${sshBase}" |
		grep -v grep |
		awk '{print $2}' |
		xargs -r kill -9
}


sshkill
ssh -i ~/.ssh/id_rsa_docker "${sshSource}" sudo chmod -R 777 /var/www/html
ssh -i ~/.ssh/id_rsa_docker "${sshTarget}" sudo chmod -R 777 /var/www/html
ssh -i ~/.ssh/id_rsa_docker "${sshSource}" rm /var/www/html/wp-content/ai1wm-backups/*.wpress &> /dev/null
ssh -i ~/.ssh/id_rsa_docker -4 -f -N -L "${localPort}:${localOrigin}" "${sshSource}"

commandComment="# wppromote-download $(node -e '
	console.log(crypto.randomBytes(32).toString("hex"))
')"

command="$(node -e "(async () => {
	const browser = await require('puppeteer').launch();
	const page = await browser.newPage();

	page.setDefaultTimeout(0);
	page.setDefaultNavigationTimeout(0);

	setTimeout(() => process.exit(1), 1800000);

	await page.goto('${localURL}/wp-admin/admin.php?page=ai1wm_export');

	await page.waitForSelector('#user_login');
	await page.type('#user_login', 'admin');
	await page.type('#user_pass', 'hunter2');
	await page.keyboard.press('Enter');
	await page.waitForNavigation();

	await page.waitForSelector('.ai1wm-button-main');
	await page.click('.ai1wm-button-main');
	await page.click('#ai1wm-export-file');
	await page.waitForSelector('a[href\$=\".wpress\"]');

	const url = await page.evaluate(() =>
		(document.querySelectorAll('a[href\$=\".wpress\"]')[0] || {}).href
	);

	const cookies =
		(await page.cookies()).map(o => \`\${o.name}=\${o.value}\`).join('; ')
	;

	console.log(
		\`wget --header 'Cookie: \${cookies}' \` +
		\`--tries=50 '\${url}' -O staging.wpress ${commandComment}\`
	);

	await browser.close();
	process.exit();
})().catch(() => process.exit(1))" 2> /dev/null | tail -n1)"

if [ ! "$(echo "${command}" | grep "${commandComment}")" ] ; then
	fail "${command}"
fi

log "${command}"
eval "${command}"


sshkill
ssh -i ~/.ssh/id_rsa_docker -4 -f -N -L "${localPort}:${localOrigin}" "${sshTarget}"

failure=''

node -e "(async () => {
	const browser = await require('puppeteer').launch();
	const page = await browser.newPage();

	page.setDefaultTimeout(0);
	page.setDefaultNavigationTimeout(0);

	setTimeout(() => process.exit(1), 1800000);

	await page.goto('${localURL}/wp-admin/admin.php?page=ai1wm_import');

	await page.waitForSelector('#user_login');
	await page.type('#user_login', 'admin');
	await page.type('#user_pass', 'hunter2');
	await page.keyboard.press('Enter');
	await page.waitForNavigation();

	await page.waitForSelector('.ai1wm-button-main');
	await page.click('.ai1wm-button-main');
	await page.waitForSelector('#ai1wm-select-file');

	const selectFile = await page.\$('#ai1wm-select-file');

	await selectFile.uploadFile('${PWD}/staging.wpress');

	await page.waitForSelector('.ai1wm-import-modal-actions .ai1wm-button-green');
	await page.click('.ai1wm-import-modal-actions .ai1wm-button-green');
	await page.waitForSelector('.ai1wm-modal-container .ai1wm-button-red');
	await page.click('.ai1wm-modal-container .ai1wm-button-red');

	await browser.close();
	process.exit();
})().catch(err => {
	console.error(err);
	process.exit(1);
})"

if (( $? )) ; then
	failure=true
fi

sshkill
ssh -i ~/.ssh/id_rsa_docker "${sshSource}" sudo chmod -R 777 /var/www/html
ssh -i ~/.ssh/id_rsa_docker "${sshTarget}" sudo chmod -R 777 /var/www/html

if [ "${failure}" ] ; then
	fail
fi
