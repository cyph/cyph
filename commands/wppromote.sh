#!/bin/bash


cd "$(mktemp -d)"


sourcePort='43000'
sourceOrigin="localhost:${sourcePort}"
sourceURL="http://${sourceOrigin}"
sshServer='wordpress.internal.cyph.com'

sshkill () {
	ps ux |
		grep -P "ssh.*${sshServer}" |
		grep -v grep |
		awk '{print $2}' |
		xargs -r kill -9
}


sshkill
ssh -i ~/.ssh/id_rsa_docker -f -N -L "${sourcePort}:${sourceOrigin}" "staging.${sshServer}" &> /dev/null

commandComment="# wppromote-download $(node -e '
	console.log(crypto.randomBytes(32).toString("hex"))
')"

command="$(node -e "(async () => {
	const browser	= await require('puppeteer').launch();
	const page		= await browser.newPage();

	setTimeout(() => process.exit(1), 600000);

	await page.goto('${sourceURL}/wp-admin/admin.php?page=ai1wm_export');

	await page.waitForSelector('#user_login');
	await page.type('#user_login', 'admin');
	await page.type('#user_pass', 'hunter2');
	await page.keyboard.press('Enter');
	await page.waitForNavigation();

	await page.waitForSelector('.ai1wm-button-main');
	await page.click('.ai1wm-button-main');
	await page.click('#ai1wm-export-file');
	await page.waitForSelector('a[href\$=\".wpress\"]', {timeout: 0});

	const url		= await page.evaluate(() =>
		(document.querySelectorAll('a[href\$=\".wpress\"]')[0] || {}).href
	);

	const cookies	=
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
ssh -i ~/.ssh/id_rsa_docker -f -N -L "${sourcePort}:${sourceOrigin}" "${sshServer}" &> /dev/null

failure=''

node -e "(async () => {
	const browser	= await require('puppeteer').launch();
	const page		= await browser.newPage();

	setTimeout(() => process.exit(1), 600000);

	await page.goto('${sourceURL}/wp-admin/admin.php?page=ai1wm_import');

	await page.waitForSelector('#user_login');
	await page.type('#user_login', 'admin');
	await page.type('#user_pass', 'hunter2');
	await page.keyboard.press('Enter');
	await page.waitForNavigation();

	await page.waitForSelector('.ai1wm-button-main');
	await page.click('.ai1wm-button-main');
	await page.waitForSelector('#ai1wm-select-file');

	const selectFile	= await page.\$('#ai1wm-select-file');

	await selectFile.uploadFile('${PWD}/staging.wpress');

	await page.waitForSelector('.ai1wm-import-modal-actions .ai1wm-button-green', {timeout: 0});
	await page.click('.ai1wm-import-modal-actions .ai1wm-button-green');
	await page.waitForSelector('.ai1wm-modal-container .ai1wm-button-red'), {timeout: 0};
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

if [ "${failure}" ] ; then
	fail
fi
