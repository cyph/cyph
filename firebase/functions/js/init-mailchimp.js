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

		const memberGroups = members
			.filter(o => !!o.email)
			.map(o => ({
				...(o.mergeFields ? {merge_fields: o.mergeFields} : {}),
				...(o.status ? {status: o.status} : {}),
				...(o.statusIfNew ? {status_if_new: o.statusIfNew} : {}),
				email_address: o.email
			}))
			.reduce(
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
					await mailchimp.lists.batchListMembers(listID, {
						members: group,
						update_existing: true
					})
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
		mailchimp && listID ? mailchimp.lists.getList(listID) : [];

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
		removeFromMailingList,
		splitName
	};
};
