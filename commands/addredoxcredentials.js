#!/usr/bin/env node


const FormData	= require('form-data');
const fs		= require('fs');
const fetch		= require('node-fetch');
const os		= require('os');


const addRedoxCredentials	= async (apiHostname, username, redoxAPIKey, redoxSecret) => {


if (
	typeof apiHostname !== 'string' ||
	typeof username !== 'string' ||
	typeof redoxAPIKey !== 'string' ||
	typeof redoxSecret !== 'string'
) {
	throw new Error(
		'addredoxcredentials ' +
		'[API hostname, e.g. api.cyph.com] ' +
		'[org Cyph username] ' +
		'[Redox API key] ' +
		'[Redox API secret]'
	);

	return;
}


const cyphAdminKey	= fs.readFileSync(
	`${os.homedir()}/.cyph/backend.vars.${apiHostname === 'api.cyph.com' ? 'prod' : 'sandbox'}`
).
	toString().
	split('CYPH_ADMIN_KEY')[1].
	split("'")[1]
;

const formData		= new FormData();

formData.append('cyphAdminKey', cyphAdminKey);
formData.append('redoxAPIKey', redoxAPIKey);
formData.append('redoxSecret', redoxSecret);
formData.append('username', username);

return fetch(
	`${apiHostname.startsWith('localhost') ? 'http' : 'https'}://${apiHostname}/redox/credentials`,
	{body: formData, method: 'PUT'}
).then(o =>
	o.text()
);


};


if (require.main === module) {
	(async () => {
		const apiHostname		= process.argv[2];
		const username			= process.argv[3];
		const redoxAPIKey		= process.argv[4];
		const redoxSecret		= process.argv[5];

		console.log(await addRedoxCredentials(apiHostname, username, redoxAPIKey, redoxSecret));
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {addRedoxCredentials};
}
