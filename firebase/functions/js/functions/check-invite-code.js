import {proto} from '@cyph/sdk';
import {
	database,
	getInviteTemplateData,
	onCall,
	validateInput
} from '../init.js';
import {renderTemplate} from '../markdown-templating.js';

const {CyphPlans} = proto;

export const checkInviteCode = onCall(async (data, namespace, getUsername) => {
	if (!data.inviteCode) {
		return {isValid: false};
	}

	const inviteCode = validateInput(data.inviteCode);
	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const inviteData = (await inviteDataRef.once('value')).val() || {};
	const {
		email,
		inviterUsername,
		keybaseUsername,
		pgpPublicKey,
		reservedUsername
	} = inviteData;
	const plan =
		inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

	const templateData = getInviteTemplateData({
		fromApp: true,
		inviteCode,
		plan
	});

	return {
		email,
		inviterUsername,
		isValid: typeof inviterUsername === 'string',
		keybaseUsername,
		pgpPublicKey,
		plan,
		reservedUsername,
		welcomeLetter: (await renderTemplate(
			'new-cyph-invite',
			templateData,
			true
		)).markdown
	};
});
