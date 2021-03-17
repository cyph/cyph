import {database, onCall, removeItem} from '../init.js';
import {validateInput} from '../validation.js';

export const rejectPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const id = validateInput(data.id);
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const {aliceUsername} = await relationshipRef
			.once('value')
			.then(o => o.val());

		if (!aliceUsername) {
			throw new Error('Relationship request not found.');
		}

		await Promise.all([
			relationshipRef.remove(),
			removeItem(namespace, `users/${aliceUsername}/contacts/${id}`)
		]);
	}
);
