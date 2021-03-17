import {proto, util} from '@cyph/sdk';
import {sendMailInternal} from '../email.js';
import {database, getName, getRealUsername, onCall, setItem} from '../init.js';
import {namespaces} from '../namespaces.js';
import {validateEmail, validateInput} from '../validation.js';

const {AccountContactState} = proto;
const {titleize, uuid} = util;

export const requestPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const {accountsURL} = namespaces[namespace];
		const email = validateEmail(data.email);
		const name = validateInput(data.name) || 'User';
		const id = uuid();
		const username = await getUsername();
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const [aliceName, aliceRealUsername] = await Promise.all([
			getName(namespace, username),
			getRealUsername(namespace, username)
		]);

		await Promise.all([
			relationshipRef.set({
				aliceUsername: username,
				bobEmail: email,
				bobName: name
			}),
			setItem(
				namespace,
				`users/${username}/contacts/${id}`,
				AccountContactState,
				{
					email,
					name,
					state: AccountContactState.States.OutgoingRequest
				}
			),
			sendMailInternal(
				email,
				`${titleize(
					contactString
				)} Request from ${aliceName} (@${aliceRealUsername})`,
				{
					data: {aliceName, id, name},
					namespace,
					templateName: 'external-contact-invite'
				}
			)
		]);
	}
);
