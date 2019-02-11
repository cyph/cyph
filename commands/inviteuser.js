#!/usr/bin/env node


const {addInviteCode}	= require('./addinvitecode');
const {sendMail}		= require('./email');


const inviteUser	= async (projectId, email, name, plan, reservedUsername) => {


/* TODO: Handle other cases */
const accountsURL	= projectId === 'cyphme' ? 'https://cyph.app/' : 'https://staging.cyph.app/';

const inviteCode	= (await addInviteCode(
	projectId,
	{'': 1},
	undefined,
	plan,
	reservedUsername
))[''][0];

await sendMail(
	!email ? undefined : !name ? email : `${name} <${email}>`,
	'Your Cyph Invite',
	`Hello${name ? ` ${name},` : ''} you've been invited to join Cyph!\n\n` +
	`Click here to use your invitation: ${accountsURL}register/${inviteCode}`
);

return inviteCode;


};


if (require.main === module) {
	(async () => {
		const projectId			= process.argv[2];
		const email				= process.argv[3];
		const name				= process.argv[4];
		const plan				= process.argv[5];
		const reservedUsername	= process.argv[6];

		console.log(`Invited with invite code ${await inviteUser(
			projectId,
			email,
			name,
			plan,
			reservedUsername
		)}`);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {inviteUser};
}
