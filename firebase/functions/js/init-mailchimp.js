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

		return mailchimp.lists
			.batchListMembers(listID, {
				members: members
					.filter(o => !!o.email)
					.map(o => ({
						...(o.mergeFields ? {merge_fields: o.mergeFields} : {}),
						...(o.status ? {status: o.status} : {}),
						...(o.statusIfNew ?
							{status_if_new: o.statusIfNew} :
							{}),
						email_address: o.email
					})),
				update_existing: true
			})
			.catch(err => {
				console.error({
					batchUpdateMailingListFailure: {
						err,
						listID,
						members
					}
				});

				throw err;
			});
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
