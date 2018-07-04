#!/usr/bin/env node


const firebase						= require('firebase-admin');
const fs							= require('fs');
const os							= require('os');
const xkcdPassphrase				= require('xkcd-passphrase');
const databaseService				= require('../modules/database-service');
const potassium						= require('../modules/potassium');


const addProCode	= async (projectId, name, password, namespace, email) => {


if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
	throw new Error('Invalid Firebase project ID.');
}
if (typeof password !== 'string' || !password) {
	password	= await xkcdPassphrase.generateWithWordCount(4);
}
if (typeof namespace !== 'string' || !namespace) {
	namespace	= 'cyph.ws';
}


const configDir		= `${os.homedir()}/.cyph`;
const keyFilename	= `${configDir}/firebase-credentials/${projectId}.json`;


const {
	database,
	processURL
}	= databaseService({
	firebase: {
		credential: firebase.credential.cert(JSON.parse(fs.readFileSync(keyFilename).toString())),
		databaseURL: `https://${projectId}.firebaseio.com`
	},
	project: {id: projectId},
	storage: {keyFilename, projectId}
});


const salt			= namespace + 'Eaf60vuVWm67dNISjm6qdTGqgEhIW4Oes+BTsiuNjvs=';
const passwordHash	= potassium.toHex((await potassium.passwordHash.hash(password, salt)).hash);

await database.ref(processURL(namespace, `lockdownIDs/${passwordHash}`)).set({
	email,
	name,
	timestamp: firebase.database.ServerValue.TIMESTAMP,
	trial: false
});


return {name, password};


};


if (require.main === module) {
	(async () => {
		const projectId			= process.argv[2];
		const name				= process.argv[3];
		const password			= process.argv[4];
		const namespace			= process.argv[5];
		const email				= process.argv[6];

		console.log(JSON.stringify(await addProCode(projectId, name, password, namespace, email)));
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {addProCode};
}
