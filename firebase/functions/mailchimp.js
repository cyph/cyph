export const initMailchimp = (mailchimp, mailchimpCredentials) => {
	const addToMailingList = async (listID, email, mergeFields) =>
		(await mailchimp.post(`/lists/${listID}/members`, {
			email_address: email,
			status: 'subscribed',
			merge_fields: mergeFields
		})).id;

	const removeFromMailingList = async (listID, idOrEmail) => {
		let id = typeof idOrEmail === 'string' ? idOrEmail : undefined;

		if (!id) {
			const email =
				typeof idOrEmail === 'object' ?
					(idOrEmail.email || '').toLowerCase().trim() :
					undefined;

			if (!email) {
				return;
			}

			const res =
				(await mailchimp.get('/search-members', {
					list_id: listID,
					query: email
				})) || {};

			const matches = [res.exact_matches, res.full_search]
				.map(o => (o || {}).members || [])
				.reduce((a, b) => a.concat(b));

			id = (
				matches.find(
					o => email === o.email_address.toLowerCase().trim()
				) || {}
			).id;
		}

		if (!id) {
			return;
		}

		await mailchimp.delete(`/lists/${listID}/members/${id}`);
	};

	const splitName = name => {
		const nameSplit = (name || '').split(' ');

		const firstName = nameSplit[0];
		const lastName = nameSplit.slice(1).join(' ');

		return {firstName, lastName};
	};

	return {
		addToMailingList,
		mailingListIDs: mailchimpCredentials.listIDs,
		removeFromMailingList,
		splitName
	};
};
