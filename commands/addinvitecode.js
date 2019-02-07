#!/usr/bin/env node


const firebase							= require('firebase-admin');
const fs								= require('fs');
const os								= require('os');
const usernameBlacklist					= new Set(require('username-blacklist'));
const databaseService					= require('../modules/database-service');
const {BooleanProto, CyphPlans}			= require('../modules/proto');
const {normalize, readableID, toInt}	= require('../modules/util');


const addInviteCode	= async (projectId, countByUser, namespace, plan, reservedUsername) => {


if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
	throw new Error('Invalid Firebase project ID.');
}
if (typeof namespace !== 'string' || !namespace) {
	namespace	= 'cyph.ws';
}

if (plan && !(plan in CyphPlans)) {
	throw new Error('Invalid plan.');
}

/* TODO: Add flag to explicitly override the blacklist and reserve a non-standard username */
if (reservedUsername && usernameBlacklist.has(normalize(reservedUsername))) {
	throw new Error('Cannot reserve blacklisted username.');
}


const configDir		= `${os.homedir()}/.cyph`;
const keyFilename	= `${configDir}/firebase-credentials/${projectId}.json`;
const namespacePath	= namespace.replace(/\./g, '_');


const {
	auth,
	database,
	getItem,
	removeItem,
	setItem,
	storage
}	= databaseService({
	firebase: {
		credential: firebase.credential.cert(JSON.parse(fs.readFileSync(keyFilename).toString())),
		databaseURL: `https://${projectId}.firebaseio.com`
	},
	project: {id: projectId},
	storage: {keyFilename, projectId}
});


const inviteCodes	= Object.keys(countByUser).map(inviterUsername => ({
	codes: new Array(countByUser[inviterUsername]).fill('').map(() => readableID(15)),
	inviterUsername
}));

await Promise.all(inviteCodes.map(async ({codes, inviterUsername}) =>
	Promise.all(codes.map(async code =>
		Promise.all([
			database.ref(`${namespacePath}/inviteCodes/${code}`).set({
				inviterUsername,
				plan: CyphPlans[plan],
				reservedUsername
			}),
			inviterUsername ?
				setItem(
					namespace,
					`users/${inviterUsername}/inviteCodes/${code}`,
					BooleanProto,
					true
				) :
				undefined
			,
			reservedUsername ?
				database.ref(
					`${namespacePath}/reservedUsernames/${normalize(reservedUsername)}`
				).set('') :
				undefined
		])
	))
));

return inviteCodes.reduce((o, {codes, inviterUsername}) => ({...o, [inviterUsername]: codes}), {});


};


if (require.main === module) {
	(async () => {
		const projectId			= process.argv[2];
		const count				= toInt(process.argv[3]);
		const namespace			= process.argv[4];
		const inviterUsername	= process.argv[5] || '';
		const plan				= process.argv[6];
		const reservedUsername	= process.argv[7];

		console.log(JSON.stringify(await addInviteCode(
			projectId,
			{[inviterUsername]: isNaN(count) ? 1 : count},
			namespace,
			plan,
			reservedUsername
		)));

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {addInviteCode};
}
