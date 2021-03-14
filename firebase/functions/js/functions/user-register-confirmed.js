import {database, getName, getRealUsername, notify} from '../base.js';

export const userRegisterConfirmed = async (data, {params}) => {
	const username = params.user;

	const [name, realUsername, registrationEmailSentRef] = await Promise.all([
		getName(params.namespace, username),
		getRealUsername(params.namespace, username),
		database.ref(
			`${params.namespace}/users/${username}/internal/registrationEmailSent`
		)
	]);

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
