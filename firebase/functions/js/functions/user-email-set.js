import {proto} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {emailRegex} from '../email-regex.js';
import {
	database,
	getItem,
	getRealUsername,
	notify,
	removeItem,
	setItem
} from '../init.js';
import {addToMailingList, mailchimp, splitName} from '../mailchimp.js';
import {sendVerificationEmail} from '../send-verification-email.js';

const {CyphPlan, CyphPlans, StringProto} = proto;

export const userEmailSet = async ({after: data}, {params}) => {
	const username = params.user;
	const userURL = `${params.namespace}/users/${username}`;
	const internalURL = `${userURL}/internal`;
	const emailRef = database.ref(`${internalURL}/email`);
	const emailVerifiedRef = database.ref(`${internalURL}/emailVerified`);
	const nameRef = database.ref(`${internalURL}/name`);
	const pseudoAccountRef = database.ref(`${userURL}/pseudoAccount`);
	const registrationEmailSentRef = database.ref(
		`${internalURL}/registrationEmailSent`
	);

	const [emailRaw, plan, planTrialEnd] = await Promise.all([
		getItem(params.namespace, `users/${username}/email`, StringProto).catch(
			() => undefined
		),
		getItem(params.namespace, `users/${username}/plan`, CyphPlan)
			.catch(() => undefined)
			.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free)),
		database
			.ref(`${internalURL}/planTrialEnd`)
			.once('value')
			.then(o => o.val())
	]);

	const email = emailRaw.trim().toLowerCase();

	const emailVerifiedUpdate = (async () => {
		const emailVerified = await emailVerifiedRef
			.once('value')
			.then(o => o.val());

		if (
			typeof emailVerified !== 'string' ||
			!emailVerified ||
			emailVerified === email
		) {
			return;
		}

		await Promise.all([
			emailVerifiedRef.remove(),
			removeItem(params.namespace, `users/${username}/emailVerified`)
		]);
	})();

	if (email && emailRegex.test(email)) {
		await Promise.all([
			emailVerifiedUpdate,
			emailRef.set(email),
			email !== emailRaw ?
				setItem(
					params.namespace,
					`users/${username}/email`,
					StringProto,
					email
				) :
				undefined,
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
		await Promise.all([
			emailVerifiedUpdate,
			emailRef.remove(),
			emailRaw ?
				removeItem(params.namespace, `users/${username}/email`) :
				undefined
		]);
	}

	await sendVerificationEmail(params.namespace, username);

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
