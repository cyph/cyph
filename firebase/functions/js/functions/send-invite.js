import {configService as config, proto, util} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {sendMailInternal} from '../email.js';
import {getInviteTemplateData} from '../get-invite-template-data.js';
import {
	database,
	getItem,
	getName,
	getRealUsername,
	onCall,
	setItem
} from '../init.js';
import {addToMailingList, mailchimp, splitName} from '../mailchimp.js';
import {namespaces} from '../namespaces.js';
import {validateEmail, validateInput} from '../validation.js';

const {BooleanProto, CyphPlan, CyphPlans} = proto;
const {readableID, titleize} = util;

export const sendInvite = onCall(async (data, namespace, getUsername) => {
	const {accountsURL} = namespaces[namespace];
	const email = validateEmail(data.email, true);
	const name = validateInput(data.name, undefined, true);
	const inviterUsername = await getUsername();
	const inviteCodesRef = database.ref(
		`${namespace}/users/${inviterUsername}/inviteCodes`
	);

	const [inviterName, inviterRealUsername, inviterPlan] = await Promise.all([
		getName(namespace, inviterUsername),
		getRealUsername(namespace, inviterUsername),
		getItem(namespace, `users/${inviterUsername}/plan`, CyphPlan)
			.catch(() => undefined)
			.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free))
	]);

	const inviterPlanConfig = config.planConfig[inviterPlan];

	const inviteCode =
		inviterPlanConfig.initialInvites !== undefined ?
			await inviteCodesRef
				.once('value')
				.then(snapshot => Object.keys(snapshot.val() || {})[0]) :
			await (async () => {
				const code = readableID(15);

				/* Previously gifted free users one-month premium trials */
				let plan = CyphPlans.Free;
				let planTrialEnd = undefined;
				if (false) {
					plan = CyphPlans.MonthlyPremium;
					planTrialEnd = new Date().setMonth(
						new Date().getMonth() + 1
					);
				}

				await Promise.all([
					database.ref(`${namespace}/inviteCodes/${code}`).set({
						inviterUsername,
						plan,
						...(email ? {email} : {}),
						...(!isNaN(planTrialEnd) ? {planTrialEnd} : {})
					}),
					setItem(
						namespace,
						`users/${inviterUsername}/inviteCodes/${code}`,
						BooleanProto,
						true
					)
				]);

				return code;
			})();

	if (!inviteCode) {
		throw new Error('No available invites.');
	}

	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const inviteData = (await inviteDataRef.once('value')).val() || {};
	const plan =
		inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

	const {firstName, lastName} = splitName(name || '');

	await Promise.all([
		inviterPlanConfig.initialInvites !== undefined &&
			inviteCodesRef.child(inviteCode).remove(),
		email ?
			database
				.ref(
					`${namespace}/inviteCodeEmailAddresses/${Buffer.from(
						email
					).toString('hex')}/${inviteCode}`
				)
				.set({inviterUsername}) :
			undefined,
		email &&
			sendMailInternal(
				email,
				`${inviterName} (@${inviterRealUsername}) Has Invited You to Cyph!` +
					(inviteData.planTrialEnd ?
						` (with ${titleize(CyphPlans[plan])} trial)` :
						''),
				{
					data: getInviteTemplateData({
						inviteCode,
						inviterName,
						name,
						plan
					}),
					namespace,
					noUnsubscribe: true,
					templateName: 'new-cyph-invite'
				}
			),
		email &&
		mailchimp &&
		mailchimpCredentials &&
		mailchimpCredentials.listIDs &&
		mailchimpCredentials.listIDs.pendingInvites ?
			addToMailingList(
				mailchimpCredentials.listIDs.pendingInvites,
				email,
				{
					FNAME: firstName,
					ICODE: inviteCode,
					LNAME: lastName,
					PLAN: CyphPlans[plan],
					TRIAL: !!inviteData.planTrialEnd
				}
			)
				.then(async mailingListID =>
					database
						.ref(`${namespace}/pendingInvites/${inviteCode}`)
						.set(mailingListID)
				)
				.catch(() => {}) :
			undefined
	]);

	return inviteCode;
});
