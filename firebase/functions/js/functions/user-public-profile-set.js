import {proto, util} from '@cyph/sdk';
import {database, getItem} from '../init.js';

const {AccountUserProfile} = proto;
const {normalize} = util;

export const userPublicProfileSet = async ({after: data}, {params}) => {
	const username = params.user;
	const internalURL = `${params.namespace}/users/${username}/internal`;
	const nameRef = database.ref(`${internalURL}/name`);
	const realUsernameRef = database.ref(`${internalURL}/realUsername`);

	const publicProfile = await getItem(
		params.namespace,
		`users/${username}/publicProfile`,
		AccountUserProfile,
		true,
		true
	).catch(() => undefined);

	return Promise.all([
		nameRef
			.once('value')
			.then(o => o.val())
			.then(async oldName =>
				publicProfile && publicProfile.name ?
					nameRef.set(publicProfile.name) :
				!oldName ?
					nameRef.set(username) :
					undefined
			),
		realUsernameRef.set(
			publicProfile &&
				normalize(publicProfile.realUsername) === username ?
				publicProfile.realUsername :
				username
		)
	]);
};
