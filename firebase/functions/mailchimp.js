module.exports = (mailchimp, mailchimpCredentials) => {
	const addToMailingList = async (listID, email, mergeFields) =>
		mailchimp.post(`/lists/${listID}/members`, {
			email_address: email,
			status: 'subscribed',
			merge_fields: mergeFields
		});

	const removeFromMailingList = async (listID, emailOrMergeFields) => {
		const email =
			typeof emailOrMergeFields === 'string' ?
				emailOrMergeFields.toLowerCase().trim() :
				undefined;

		const mergeFields =
			typeof emailOrMergeFields === 'object' ?
				Object.entries(emailOrMergeFields) :
				undefined;

		if (!email && !(mergeFields && mergeFields.length > 0)) {
			return;
		}

		const res =
			(await mailchimp.get('/search-members', {
				list_id: listID,
				query: email ? email : mergeFields[0][1]
			})) || {};

		const matches = [res.exact_matches, res.full_search]
			.map(o => (o || {}).members || [])
			.reduce((a, b) => a.concat(b));

		const {id} =
			(email ?
				matches.find(
					o => email === o.email_address.toLowerCase().trim()
				) :
				matches.find(o =>
					mergeFields.reduce(
						(matched, [k, v]) => matched && o.merge_fields[k] === v,
						true
					)
				)) || {};

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
