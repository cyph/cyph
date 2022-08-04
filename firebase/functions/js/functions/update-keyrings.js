import {proto} from '@cyph/sdk';
import difference from 'lodash-es/difference.js';
import {sendEmailInternal} from '../email.js';
import {admin, database, getItem, lock, onCall, processItem} from '../init.js';

const {BinaryProto} = proto;

export const updateKeyrings = onCall(
	async (data, namespace, getUsername, testEnvName) => {
		const username = await getUsername();
		const {algorithms, csr, newPrivateKeyringBytes, newPublicKeyringBytes} =
			data;

		const keyringRootURL = `users/${username}/keyrings`;
		const keyringRootRef = database.ref(`${namespace}/${keyringRootURL}`);

		return lock(namespace, keyringRootURL, async () => {
			const currentAlgorithms = JSON.parse(
				(
					await keyringRootRef.child('algorithms').once('value')
				).val() || '{}'
			);

			if (
				!(csr instanceof Uint8Array) ||
				!(newPrivateKeyringBytes instanceof Uint8Array) ||
				!(newPublicKeyringBytes instanceof Uint8Array) ||
				!algorithms ||
				(difference(
					algorithms.boxAlgorithms ?? [],
					currentAlgorithms.boxAlgorithms ?? []
				).length < 1 &&
					difference(
						algorithms.signAlgorithms ?? [],
						currentAlgorithms.signAlgorithms ?? []
					).length < 1)
			) {
				return {
					privateKeyringBytes: await getItem(
						namespace,
						`${keyringRootURL}/private`,
						BinaryProto
					),
					wasUpdated: false
				};
			}

			await keyringRootRef.set({
				algorithms: JSON.stringify(algorithms),
				csr: processItem(csr),
				private: processItem(newPrivateKeyringBytes),
				public: processItem(newPublicKeyringBytes)
			});

			await Promise.all([
				database.ref(`${namespace}/pendingSignups/${username}`).set({
					reissue: true,
					timestamp: admin.database.ServerValue.TIMESTAMP
				}),
				sendEmailInternal(
					'user-rekeys@cyph.com',
					`${
						testEnvName ?
							`${testEnvName.replace(/^(.)/, s =>
								s.toUpperCase()
							)}: ` :
							''
					}Cyph User Rekey`,
					`${username}@${namespace.replace(/_/g, '.')}`
				)
			]);

			return {
				privateKeyringBytes: newPrivateKeyringBytes,
				wasUpdated: true
			};
		});
	}
);
