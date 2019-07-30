#!/usr/bin/env node


const childProcess		= require('child_process');
const fs				= require('fs');
const {addInviteCode}	= require('./addinvitecode');
const {getQR}			= require('./qr');


const qrInviteCodeDir	= `${__dirname}/../qr-invite-codes`;


const qrInviteCode	= async (countByUser, plan) => {


childProcess.spawnSync('rm', ['-rf', qrInviteCodeDir]);
fs.mkdirSync(qrInviteCodeDir);

const inviteCodes	= Object.values(
	await addInviteCode('cyphme', countByUser, undefined, plan)
)[0];

for (let i = 0 ; i < inviteCodes.length ; ++i) {
	const url	= `https://cyph.app/register/${inviteCodes[i]}`;

	await getQR(url, `${qrInviteCodeDir}/${i}.png`);
	fs.writeFileSync(`${qrInviteCodeDir}/${i}.txt`, url);
}


};


if (require.main === module) {
	(async () => {
		const count				= toInt(process.argv[2]);
		const plan				= process.argv[3];
		const inviterUsername	= process.argv[4] || '';

		await qrInviteCode(
			{[inviterUsername]: isNaN(count) ? 1 : count},
			plan
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {qrInviteCode};
}
