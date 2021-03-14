import {proto, util} from '@cyph/sdk';
import {
	database,
	getName,
	hasItem,
	notify,
	onCall,
	removeItem,
	setItem,
	validateInput
} from '../base.js';

const {AccountContactState, StringProto} = proto;
const {titleize} = util;

export const acceptPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const id = validateInput(data.id);
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const [relationshipVal, bob] = await Promise.all([
			relationshipRef.once('value').then(o => o.val()),
			getUsername()
		]);

		const bobNameRef = database.ref(
			`${namespace}/users/${bob}/internal/name`
		);

		const alice = relationshipVal.aliceUsername;
		const email = relationshipVal.bobEmail;
		const name = relationshipVal.bobName;

		if (!alice || !bob || !email || !name) {
			throw new Error('Users not found.');
		}

		await Promise.all([
			relationshipRef.remove(),
			removeItem(namespace, `users/${alice}/contacts/${id}`),
			setItem(
				namespace,
				`users/${alice}/contacts/${bob}`,
				AccountContactState,
				{email, name, state: AccountContactState.States.Confirmed}
			),
			setItem(
				namespace,
				`users/${bob}/contacts/${alice}`,
				AccountContactState,
				{state: AccountContactState.States.Confirmed}
			),
			hasItem(namespace, `users/${bob}/email`).then(async hasEmail =>
				hasEmail ?
					undefined :
					setItem(namespace, `users/${bob}/email`, StringProto, email)
			),
			bobNameRef
				.once('value')
				.then(o => o.val())
				.then(async oldBobName =>
					!oldBobName || oldBobName === bob ?
						bobNameRef.set(name) :
						undefined
				),
			getName(namespace, alice).then(async aliceName =>
				notify(
					namespace,
					alice,
					`${titleize(contactString)} Confirmation from ${email}`,
					{
						data: {aliceName, name},
						templateName: 'external-contact-accept'
					}
				)
			)
		]);

		return alice;
	}
);
