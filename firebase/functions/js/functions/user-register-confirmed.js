import {database, getName, getRealUsername, notify} from '../init.js';

export const userRegisterConfirmed = async (data, {params}) => {
	const username = params.user;

	const registrationEmailSentRef = database.ref(
		`${params.namespace}/users/${username}/internal/registrationEmailSent`
	);

	const [name, realUsername, registrationEmailSent] = await Promise.all([
		getName(params.namespace, username),
		getRealUsername(params.namespace, username),
		registrationEmailSentRef.once('value')
	]);

	if (registrationEmailSent) {
		return;
	}

	await Promise.all([
		notify(params.namespace, username, `Welcome to Cyph, ${realUsername}`, {
			data: {
				name,
				primaryNamespace: params.namespace === 'cyph_ws'
			},
			templateName: 'registration-confirmed'
		}),
		registrationEmailSentRef.set(true)
	]);
};
