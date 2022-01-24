import {proto} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {
	database,
	getItem,
	getRealUsername,
	notify,
	removeItem,
	setItem
} from '../init.js';
import {addToMailingList, mailchimp} from '../mailchimp.js';
import {sendVerificationEmail} from '../send-verification-email.js';
import {updatePublishedEmail} from '../update-published-email.js';
import {validateEmail} from '../validation.js';

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

	const email = validateEmail(emailRaw, true);

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
			removeItem(params.namespace, `users/${username}/emailVerified`),
			updatePublishedEmail(params.namespace, username, undefined, true)
		]);
	})();

	if (email) {
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
				if (!mailchimp || !mailchimpCredentials?.listIDs?.users) {
					return;
				}

				const [inviteCode, inviterUsername, name] = await Promise.all([
					getItem(
						params.namespace,
						`users/${username}/inviteCode`,
						StringProto
					).catch(() => ''),
					getItem(
						params.namespace,
						`users/${username}/inviterUsernamePlaintext`,
						StringProto
					).catch(() => ''),
					nameRef.once('value').then(o => o.val())
				]);

				await addToMailingList(
					mailchimpCredentials.listIDs.users,
					email,
					{
						inviteCode,
						inviterUsername,
						name,
						plan,
						trial: !!planTrialEnd,
						username
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

	const [pseudoAccount, registrationEmailSent] = (
		await Promise.all([
			pseudoAccountRef.once('value'),
			registrationEmailSentRef.once('value')
		])
	).map(o => o.val());

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
