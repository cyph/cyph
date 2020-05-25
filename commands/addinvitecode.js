#!/usr/bin/env node

const usernameBlacklist = new Set(require('username-blacklist'));
const databaseService = require('../modules/database-service');
const {BooleanProto, CyphPlans} = require('../modules/proto');
const {normalize, readableID, toInt} = require('../modules/util');

const addInviteCode = async (
	projectId,
	countByUser,
	namespace,
	plan,
	reservedUsername,
	trialMonths,
	email,
	misc = {}
) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	if (plan && !(plan in CyphPlans)) {
		throw new Error(`Plan "${plan}" not found.`);
	}

	/* Previously gifted free users one-month premium trials */
	if (false && (!plan || plan === 'Free') && !trialMonths) {
		plan = 'MonthlyPremium';
		trialMonths = 1;
	}

	reservedUsername = reservedUsername ?
		normalize(reservedUsername) :
		undefined;

	/* TODO: Add flag to explicitly override the blacklist and reserve a non-standard username */
	if (reservedUsername && usernameBlacklist.has(reservedUsername)) {
		throw new Error('Cannot reserve blacklisted username.');
	}

	const namespacePath = namespace.replace(/\./g, '_');

	const {
		auth,
		database,
		getItem,
		removeItem,
		setItem,
		storage
	} = databaseService(projectId);

	const inviteCodes = Object.keys(countByUser).map(inviterUsername => ({
		codes: new Array(
			typeof countByUser[inviterUsername] === 'string' ?
				parseInt(countByUser[inviterUsername] || '0', 10) :
				countByUser[inviterUsername]
		)
			.fill('')
			.map(() => readableID(15)),
		inviterUsername: normalize(inviterUsername)
	}));

	if (
		reservedUsername &&
		(await database
			.ref(`${namespacePath}/users/${reservedUsername}/publicProfile`)
			.once('value')).val()
	) {
		reservedUsername = undefined;
	}

	await Promise.all(
		inviteCodes.map(async ({codes, inviterUsername}) =>
			Promise.all(
				codes.map(async code =>
					Promise.all([
						database
							.ref(`${namespacePath}/inviteCodes/${code}`)
							.set({
								...misc,
								inviterUsername,
								...(email ? {email} : {}),
								...(plan ? {plan: CyphPlans[plan]} : {}),
								...(reservedUsername ? {reservedUsername} : {}),
								...(trialMonths ?
									{
										planTrialEnd: new Date().setMonth(
											new Date().getMonth() +
												parseInt(trialMonths, 10)
										)
									} :
									{})
							}),
						inviterUsername ?
							setItem(
								namespace,
								`users/${inviterUsername}/inviteCodes/${code}`,
								BooleanProto,
								true
							) :
							undefined,
						reservedUsername ?
							database
								.ref(
									`${namespacePath}/reservedUsernames/${reservedUsername}`
								)
								.set('') :
							undefined
					])
				)
			)
		)
	);

	return inviteCodes.reduce(
		(o, {codes, inviterUsername}) => ({...o, [inviterUsername]: codes}),
		{}
	);
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];
		const count = toInt(process.argv[3]);
		const namespace = process.argv[4];
		const inviterUsername = process.argv[5] || '';
		const plan = process.argv[6];
		const reservedUsername = process.argv[7];
		const trialMonths = process.argv[8];
		const misc = JSON.parse(process.argv[9] || '{}');

		console.log(
			JSON.stringify(
				await addInviteCode(
					projectId,
					{[inviterUsername]: isNaN(count) ? 1 : count},
					namespace,
					plan,
					reservedUsername,
					trialMonths,
					undefined,
					misc
				)
			)
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {addInviteCode};
}
