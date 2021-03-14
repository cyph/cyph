import {proto} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {
	addToMailingList,
	database,
	getItem,
	getRealUsername,
	mailchimp,
	notify,
	splitName
} from '../base.js';
import {emailRegex} from '../email-regex.js';

const {CyphPlan, CyphPlans, StringProto} = proto;

export const userEmailSet = async ({after: data}, {params}) => {
	const username = params.user;
	const userURL = `${params.namespace}/users/${username}`;
	const internalURL = `${userURL}/internal`;
	const emailRef = database.ref(`${internalURL}/email`);
	const nameRef = database.ref(`${internalURL}/name`);
	const pseudoAccountRef = database.ref(`${userURL}/pseudoAccount`);
	const registrationEmailSentRef = database.ref(
		`${internalURL}/registrationEmailSent`
	);

	const [email, plan, planTrialEnd] = await Promise.all([
		getItem(params.namespace, `users/${username}/email`, StringProto)
			.then(s => s.trim().toLowerCase())
			.catch(() => undefined),
		getItem(params.namespace, `users/${username}/plan`, CyphPlan)
			.catch(() => undefined)
			.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free)),
		database
			.ref(`${internalURL}/planTrialEnd`)
			.once('value')
			.then(o => o.val())
	]);

	if (email && emailRegex.test(email)) {
		await Promise.all([
			emailRef.set(email),
			(async () => {
				if (
					!mailchimp ||
					!mailchimpCredentials ||
					!mailchimpCredentials.listIDs ||
					!mailchimpCredentials.listIDs.users
				) {
					return;
				}

				const {firstName, lastName} = splitName(
					(await nameRef.once('value')).val()
				);

				await addToMailingList(
					mailchimpCredentials.listIDs.users,
					email,
					{
						FNAME: firstName,
						LNAME: lastName,
						PLAN: CyphPlans[plan],
						TRIAL: !!planTrialEnd,
						USERNAME: username
					}
				);
			})().catch(() => {})
		]);
	}
	else {
		await emailRef.remove();
	}

	const [pseudoAccount, registrationEmailSent] = (await Promise.all([
		pseudoAccountRef.once('value'),
		registrationEmailSentRef.once('value')
	])).map(o => o.val());
	if (pseudoAccount || registrationEmailSent) {
		return;
	}

	const [realUsername] = await Promise.all([
		getRealUsername(params.namespace, username),
		registrationEmailSentRef.set(true)
	]);

	await notify(
		params.namespace,
		username,
		`Your Registration is Being Processed, ${realUsername}`,
		{templateName: 'registration-pending'}
	);
};
