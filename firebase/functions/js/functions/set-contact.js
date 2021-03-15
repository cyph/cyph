import {proto, util} from '@cyph/sdk';
import {
	database,
	getItem,
	onCall,
	removeItem,
	setItem,
	validateInput
} from '../init.js';
import {notifyUser} from '../notify-user.js';

const {AccountContactState, AccountUserProfile, NotificationTypes} = proto;
const {normalize} = util;

export const setContact = onCall(async (data, namespace, getUsername) => {
	const add = data.add === true;
	const innerCircle = data.innerCircle === true;
	const contact = normalize(validateInput(data.username));
	const username = await getUsername();

	const contactURL = `users/${username}/contacts/${contact}`;
	const otherContactURL = `users/${contact}/contacts/${username}`;
	const innerCircleURL = `users/${username}/contactsInnerCircle/${contact}`;
	const otherInnerCircleURL = `users/${contact}/contactsInnerCircle/${username}`;

	const pseudoAccountRef = database.ref(
		`${namespace}/users/${username}/pseudoAccount`
	);

	const [otherContactState, otherContactStateNewData] = await Promise.all([
		getItem(
			namespace,
			innerCircle ? otherInnerCircleURL : otherContactURL,
			AccountContactState
		)
			.then(o => o.state)
			.catch(() => undefined),
		pseudoAccountRef.once('value').then(async o =>
			!o.val() ?
				{} :
				{
					email: ' ',
					name: (await getItem(
						namespace,
						`users/${username}/publicProfile`,
						AccountUserProfile,
						true,
						true
					).catch(() => ({}))).name
				}
		)
	]);

	const notifyContact = async type =>
		notifyUser(
			{metadata: {innerCircle}, target: contact, type},
			namespace,
			username,
			true
		);

	const setContactState = async (currentUser, state) =>
		Promise.all(
			[
				currentUser ? contactURL : otherContactURL,
				...(innerCircle || state === undefined ?
					[currentUser ? innerCircleURL : otherInnerCircleURL] :
					[])
			].map(async url =>
				state === undefined ?
					removeItem(namespace, url) :
					setItem(namespace, url, AccountContactState, {
						...(currentUser ? {} : otherContactStateNewData),
						innerCircle,
						state
					})
			)
		);

	/* Remove */
	if (!add) {
		return Promise.all([setContactState(true), setContactState(false)]);
	}

	/* Mutual acceptance */
	if (
		otherContactState === AccountContactState.States.Confirmed ||
		otherContactState === AccountContactState.States.OutgoingRequest
	) {
		return Promise.all([
			setContactState(true, AccountContactState.States.Confirmed),
			setContactState(false, AccountContactState.States.Confirmed),
			notifyContact(NotificationTypes.ContactAccept)
		]);
	}

	/* Outgoing request */
	return Promise.all([
		setContactState(true, AccountContactState.States.OutgoingRequest),
		setContactState(false, AccountContactState.States.IncomingRequest),
		notifyContact(NotificationTypes.ContactRequest)
	]);
});
