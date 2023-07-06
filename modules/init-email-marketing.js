import {proto, util} from '@cyph/sdk';

const {CyphPlans} = proto;
const {retryUntilSuccessful} = util;

export const initEmailMarketing = (crisp, emailMarketingCredentials) => {
	const crispRetryConfig = {
		delay: 25,
		maxAttempts: 10
	};

	const crispRetry = {
		website: {
			...Object.fromEntries(
				[
					'addNewPeopleProfile',
					'getPeopleData',
					'getPeopleProfile',
					'listPeopleProfiles',
					'updatePeopleData',
					'updatePeopleProfile'
				].map(methodName => [
					methodName,
					async (...args) =>
						retryUntilSuccessful(
							async () => crisp.website[methodName](...args),
							crispRetryConfig.maxAttempts,
							crispRetryConfig.delay
						)
				])
			)
		}
	};

	const addToMailingListInternal = async (
		listID,
		email,
		mergeFields,
		skipAddIfPreviouslyRemoved = false
	) => {
		if (
			!crisp ||
			!emailMarketingCredentials?.websiteID ||
			!listID ||
			!email
		) {
			return;
		}

		const profile = await crispRetry.website
			.getPeopleProfile(emailMarketingCredentials.websiteID, email)
			.catch(() => undefined);

		const dataToUpdate = new Map();

		if (profile) {
			const {data} = await crispRetry.website
				.getPeopleData(emailMarketingCredentials.websiteID, email)
				.catch(() => ({}));

			const removedSegments = new Set(
				data?.removedSegments ? JSON.parse(data.removedSegments) : []
			);
			const segments = new Set(profile?.segments ?? []);

			if (skipAddIfPreviouslyRemoved) {
				if (!removedSegments.has(listID)) {
					segments.add(listID);
				}
			}
			else {
				segments.add(listID);

				if (removedSegments.has(listID)) {
					removedSegments.delete(listID);
					dataToUpdate.set(
						'removedSegments',
						JSON.stringify(Array.from(removedSegments))
					);
				}
			}

			await crispRetry.website.updatePeopleProfile(
				emailMarketingCredentials.websiteID,
				email,
				{
					...(mergeFields?.name &&
					mergeFields.name !== profile.person.nickname ?
						{
							person: {nickname: mergeFields.name}
						} :
						{}),
					segments: Array.from(segments)
				}
			);
		}
		else {
			await crispRetry.website.addNewPeopleProfile(
				emailMarketingCredentials.websiteID,
				{
					email,
					person: {
						nickname: mergeFields?.name || email
					},
					segments: [listID]
				}
			);
		}

		if (!mergeFields && dataToUpdate.size < 1) {
			return;
		}

		await crispRetry.website.updatePeopleData(
			emailMarketingCredentials.websiteID,
			email,
			{
				data: {
					...(mergeFields ?
						mailingListMemberMetadata(mergeFields) :
						{}),
					...(dataToUpdate.size > 0 ?
						Object.fromEntries(dataToUpdate) :
						{})
				}
			}
		);
	};

	const addToMailingList = async (listID, email, mergeFields) =>
		addToMailingListInternal(listID, email, mergeFields);

	const batchUpdateMailingList = async (listID, members) => {
		if (!crisp || !emailMarketingCredentials?.websiteID || !listID) {
			return;
		}

		for (const {email, mergeFields} of members) {
			await addToMailingListInternal(listID, email, mergeFields, true);
		}
	};

	const getMailingList = async listID => {
		const list = [];

		if (!(crisp && listID && emailMarketingCredentials?.websiteID)) {
			return list;
		}

		for (let i = 1; true; ++i) {
			const nextPage = await crispRetry.website.listPeopleProfiles(
				emailMarketingCredentials.websiteID,
				i,
				undefined,
				undefined,
				undefined,
				JSON.stringify([
					{
						criterion: 'segments',
						model: 'people',
						operator: 'eq',
						query: [listID]
					}
				]),
				undefined
			);

			if (nextPage.length < 1) {
				break;
			}

			list.push(...nextPage);
		}

		return list;
	};

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
					contactCount: user.contactCount,
					messageCount: user.messageCount,
					masterKeyConfirmed: user.masterKeyConfirmed ? 'true' : ''
				} :
				{}),
			...(user?.dates?.certIssuance?.date ?
				{certIssuanceDate: user.dates.certIssuance.date} :
				{}),
			...(user?.dates?.lastLogin?.date ?
				{lastLoginDate: user.dates.lastLogin.date} :
				{}),
			...(user?.plan?.lastChange?.date ?
				{lastplanChangeDate: user.plan.lastChange.date} :
				{}),
			...(user?.dates?.signup?.date ?
				{signupDate: user.dates.signup.date} :
				{}),
			...(name ? {firstName, lastName} : {}),
			...(username ? {username} : {}),
			inviteCode,
			inviterUsername,
			keybaseUsername,
			plan,
			trial
		};
	};

	const removeFromMailingList = async (listID, email) => {
		if (
			!crisp ||
			!emailMarketingCredentials?.websiteID ||
			!listID ||
			!email
		) {
			return;
		}

		const profile = await crispRetry.website
			.getPeopleProfile(emailMarketingCredentials.websiteID, email)
			.catch(() => undefined);

		const segments = new Set(profile?.segments ?? []);

		if (!segments.has(listID)) {
			return;
		}

		segments.delete(listID);

		await crispRetry.website.updatePeopleProfile(
			emailMarketingCredentials.websiteID,
			email,
			{
				segments: Array.from(segments)
			}
		);

		const {data} = await crispRetry.website
			.getPeopleData(emailMarketingCredentials.websiteID, email)
			.catch(() => ({}));

		const removedSegments = new Set(
			data?.removedSegments ? JSON.parse(data.removedSegments) : []
		);
		if (removedSegments.has(listID)) {
			return;
		}
		removedSegments.add(listID);

		await crispRetry.website.updatePeopleData(
			emailMarketingCredentials.websiteID,
			email,
			{
				data: {
					removedSegments: JSON.stringify(Array.from(removedSegments))
				}
			}
		);
	};

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
		mailingListIDs: emailMarketingCredentials?.listIDs || {},
		mailingListMemberMetadata,
		removeFromMailingList,
		splitName
	};
};
