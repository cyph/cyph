import {proto, util} from '@cyph/sdk';

const {CyphPlans} = proto;
const {retryUntilSuccessful} = util;

export const initMailchimp = (mailchimp, mailchimpCredentials) => {
	const addToMailingList = async (listID, email, mergeFields) =>
		batchUpdateMailingList(listID, [
			{
				email,
				mergeFields,
				statusIfNew: 'subscribed'
			}
		]);

	const batchUpdateMailingList = async (listID, members) => {
		if (!mailchimp || !listID) {
			return;
		}

		const memberGroups = Array.from(
			new Map(
				members
					.filter(o => !!o.email)
					.map(o => [
						o.email,
						{
							...(o.mergeFields ?
								{
									merge_fields: mailingListMemberMetadata(
											o.mergeFields
										)
								} :
								{}),
							...(o.status ? {status: o.status} : {}),
							...(o.statusIfNew ?
								{status_if_new: o.statusIfNew} :
								{}),
							email_address: o.email
						}
					])
			).values()
		).reduce(
			(arr, member) => {
				if (arr[arr.length - 1].length >= 500) {
					arr.push([member]);
				}
				else {
					arr[arr.length - 1].push(member);
				}

				return arr;
			},
			[[]]
		);

		const responses = [];

		for (const group of memberGroups) {
			try {
				responses.push(
					await retryUntilSuccessful(
						async () =>
							mailchimp.lists.batchListMembers(listID, {
								members: group,
								update_existing: true
							}),
						undefined,
						undefined,
						600000
					)
				);
			}
			catch (err) {
				console.error({
					batchUpdateMailingListFailure: {
						err,
						group,
						listID,
						members
					}
				});

				throw err;
			}
		}

		return responses;
	};

	const getMailingList = async listID =>
		mailchimp && listID ?
			retryUntilSuccessful(
				async () => mailchimp.lists.getList(listID),
				undefined,
				undefined,
				60000
			) :
			[];

	const mailingListMemberMetadata = ({
		inviteCode = '',
		inviterUsername = '',
		keybaseUsername = '',
		name = '',
		plan = '',
		trial = false,
		username = '',
		user
	} = {}) => {
		if (user) {
			inviteCode = user.inviteCode || inviteCode;
			inviterUsername = user.inviterUsername || inviterUsername;
			keybaseUsername =
				user.profileExtra?.pgp?.keybaseUsername || keybaseUsername;
			name = user.internal?.name || name;
			plan = user.plan?.name || plan;
			trial =
				user.internal?.planTrialEnd === undefined ?
					trial :
					!!user.internal?.planTrialEnd;
			username = user.username || username;
		}

		if (typeof plan === 'number') {
			plan = CyphPlans[plan];
		}
		if (typeof plan !== 'string' || !plan || !(plan in CyphPlans)) {
			plan = CyphPlans[CyphPlans.Free];
		}

		const {firstName, lastName} = splitName(name);

		return {
			/* TODO: Keep these continually in sync server-side */
			...(user ?
				{
					CONTACTS: user.contactCount,
					MESSAGES: user.messageCount,
					MKCONFIRM: user.masterKeyConfirmed ? 'true' : ''
				} :
				{}),
			...(user?.dates?.certIssuance?.date ?
				{CERTDATE: user.dates.certIssuance.date} :
				{}),
			...(user?.dates?.lastLogin?.date ?
				{LOGINDATE: user.dates.lastLogin.date} :
				{}),
			...(user?.plan?.lastChange?.date ?
				{PLANDATE: user.plan.lastChange.date} :
				{}),
			...(user?.dates?.signup?.date ?
				{SIGNUPDATE: user.dates.signup.date} :
				{}),

			...(name ? {FNAME: firstName, LNAME: lastName} : {}),
			...(username ? {USERNAME: username} : {}),
			ICODE: inviteCode,
			INVITER: inviterUsername,
			KEYBASE: keybaseUsername,
			PLAN: plan,
			TRIAL: trial ? 'true' : ''
		};
	};

	const removeFromMailingList = async (listID, email) =>
		batchUpdateMailingList(listID, [
			{
				email,
				status: 'unsubscribed'
			}
		]);

	const splitName = name => {
		const nameSplit = (name || '').split(' ');

		const firstName = nameSplit[0];
		const lastName = nameSplit.slice(1).join(' ');

		return {firstName, lastName};
	};

	return {
		addToMailingList,
		batchUpdateMailingList,
		getMailingList,
		mailingListIDs: mailchimpCredentials.listIDs,
		mailingListMemberMetadata,
		removeFromMailingList,
		splitName
	};
};
