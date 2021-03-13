#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {
	configService as config,
	potassiumService as potassium,
	proto,
	util
} from '@cyph/sdk';
import fs from 'fs';
import os from 'os';
import read from 'read';
import {initDatabaseService} from '../modules/database-service.js';
import {addInviteCode} from './addinvitecode.js';
import {getPublicKeys, sign} from './sign.js';

const {
	AGSEPKICert,
	AGSEPKICSR,
	AGSEPKIIssuanceHistory,
	BinaryProto,
	CyphPlan,
	CyphPlans,
	StringProto
} = proto;
const {deserialize, lockFunction, serialize, sleep} = util;

const readInput = async prompt =>
	new Promise(resolve => {
		read(
			{
				prompt
			},
			(err, s) => {
				resolve(err ? undefined : s);
			}
		);
	});

const duplicateCSRLock = lockFunction();

const duplicateCSR = async (issuanceHistory, csr, publicSigningKeyHash) =>
	issuanceHistory.publicSigningKeyHashes[publicSigningKeyHash] ||
	(issuanceHistory.usernames[csr.username] &&
		(await duplicateCSRLock(async () => {
			while (true) {
				const response = await readInput(
					`Reissue certificate for @${csr.username}? [y/n]`
				);

				if (response === 'y') {
					return false;
				}
				else if (response === 'n') {
					return true;
				}
			}
		})));

export const certSign = async (projectId, standalone, namespace) => {
	try {
		if (typeof projectId !== 'string' || !projectId) {
			projectId = 'cyphme';
		}
		if (projectId.indexOf('cyph') !== 0) {
			throw new Error('Invalid Firebase project ID.');
		}
		if (typeof namespace !== 'string' || !namespace) {
			namespace = 'cyph.ws';
		}

		const testSign = projectId !== 'cyphme';
		const configDir = `${os.homedir()}/.cyph`;
		const issuanceHistoryParentPath = `${configDir}/certsign-history`;
		const issuanceHistoryPath = `${issuanceHistoryParentPath}/${projectId}.${namespace}`;
		const lastIssuanceTimestampParentPath = `${configDir}/certsign-timestamps`;
		const lastIssuanceTimestampPath = `${lastIssuanceTimestampParentPath}/${projectId}.${namespace}`;

		/* Will remain hardcoded as true for the duration of the private beta */
		const requireInvite = true;

		const getHash = async bytes =>
			potassium.toBase64(await potassium.hash.hash(bytes));

		const {
			auth,
			database,
			getItem,
			hasItem,
			removeItem,
			setItem,
			storage
		} = initDatabaseService(projectId);

		const namespacePath = namespace.replace(/\./g, '_');

		const lastIssuanceTimestampRef = database.ref(
			`${namespacePath}/certificateHistoryTimestamp`
		);

		const pendingSignupsURL = `${namespacePath}/pendingSignups`;
		const pendingSignups =
			(await database.ref(pendingSignupsURL).once('value')).val() || {};
		const usernames = [];

		for (const username of Object.keys(pendingSignups)) {
			const pendingSignup = pendingSignups[username];

			/* If user has submitted a CSR and has a valid invite (if required), continue */
			if (
				(await hasItem(
					namespace,
					`users/${username}/certificateRequest`
				)) &&
				(!requireInvite ||
					(await getItem(
						namespace,
						`users/${username}/inviterUsernamePlaintext`,
						StringProto
					).catch(() => ' ')) !== ' ')
			) {
				usernames.push(username);
			}
			/* Otherwise, if signup has been pending for at least 3 hours, delete the user */
			else if (Date.now() - pendingSignup.timestamp > 10800000) {
				/* For now, just log to console and handle deletion manually */
				console.error(`INVALID PENDING USER: @${username}`);
				continue;

				await auth.deleteUser(pendingSignup.uid);
				await database.ref(`${pendingSignupsURL}/${username}`).remove();
				await removeItem(namespace, `users/${username}`);

				/* Avoid {"code":400,"message":"QUOTA_EXCEEDED : Exceeded quota for deleting accounts."} */
				await sleep(1000);
			}
		}

		if (usernames.length < 1) {
			console.log('No certificate requests.');
			process.exit(0);
		}

		const agsePublicSigningKeys = getPublicKeys();

		const issuanceHistory = await (async () => {
			const lastIssuanceTimestampLocal = parseFloat(
				fs.readFileSync(lastIssuanceTimestampPath).toString()
			);

			const lastIssuanceTimestampRemote = (await lastIssuanceTimestampRef.once(
				'value'
			)).val();

			if (
				isNaN(lastIssuanceTimestampLocal) &&
				isNaN(lastIssuanceTimestampRemote)
			) {
				throw new Error(
					'Invalid AGSE-PKI history: timestamp not found.'
				);
			}

			const lastIssuanceTimestamp =
				isNaN(lastIssuanceTimestampRemote) ||
				lastIssuanceTimestampLocal >= lastIssuanceTimestampRemote ?
					lastIssuanceTimestampLocal :
				(await readInput(
						`Trust AGSE-PKI history from server with timestamp ${new Date(
							lastIssuanceTimestampRemote
						).toLocaleString()}? [y/N]`
					)) === 'y' ?
					lastIssuanceTimestampRemote :
					undefined;
			if (lastIssuanceTimestamp === undefined) {
				throw new Error(
					'Invalid AGSE-PKI history: timestamp not accepted.'
				);
			}

			const bytes =
				lastIssuanceTimestamp === lastIssuanceTimestampLocal &&
				fs.existsSync(issuanceHistoryPath) ?
					fs.readFileSync(issuanceHistoryPath) :
					await getItem(namespace, 'certificateHistory', BinaryProto);

			const dataView = potassium.toDataView(bytes);
			const rsaKeyIndex = dataView.getUint32(0, true);
			const sphincsKeyIndex = dataView.getUint32(4, true);
			const signed = potassium.toBytes(bytes, 8);

			if (
				rsaKeyIndex >= agsePublicSigningKeys.rsa.length ||
				sphincsKeyIndex >= agsePublicSigningKeys.sphincs.length
			) {
				throw new Error('Invalid AGSE-PKI history: bad key index.');
			}

			const o = await deserialize(
				AGSEPKIIssuanceHistory,
				await potassium.sign.open(
					signed,
					await potassium.sign.importSuperSphincsPublicKeys(
						agsePublicSigningKeys.rsa[rsaKeyIndex],
						agsePublicSigningKeys.sphincs[sphincsKeyIndex]
					),
					`${namespace}:AGSEPKIIssuanceHistory`
				)
			);

			if (o.timestamp !== lastIssuanceTimestamp) {
				throw new Error('Invalid AGSE-PKI history: bad timestamp.');
			}

			return o;
		})().catch(() => ({
			publicSigningKeyHashes: {},
			timestamp: 0,
			usernames: {}
		}));

		if (
			Object.keys(issuanceHistory.usernames).length < 1 &&
			(await readInput(
				`Init AGSE-PKI issuance history from scratch? [y/N]`
			)) !== 'y'
		) {
			throw new Error('Failed to get AGSE-PKI history.');
		}

		const csrs = (await Promise.all(
			usernames.map(async username => {
				try {
					if (
						!username ||
						username !==
							username
								.toLowerCase()
								.replace(/[^0-9a-z_]/g, '')
								.slice(0, 50)
					) {
						return;
					}

					const bytes = await getItem(
						namespace,
						`users/${username}/certificateRequest`,
						BinaryProto
					);

					const csr = await deserialize(
						AGSEPKICSR,
						new Uint8Array(
							bytes.buffer,
							bytes.byteOffset + (await potassium.sign.bytes)
						)
					);

					if (
						!csr.publicSigningKey ||
						csr.publicSigningKey.length < 1 ||
						!csr.username ||
						csr.username !== username
					) {
						return;
					}

					const publicSigningKeyHash = await getHash(
						csr.publicSigningKey
					);

					/* Validate that CSR data doesn't already belong to an existing user. */
					if (
						await duplicateCSR(
							issuanceHistory,
							csr,
							publicSigningKeyHash
						)
					) {
						console.log(
							`Ignoring duplicate CSR for ${csr.username}.`
						);
						return;
					}

					/* Validate CSR signature. */
					await potassium.sign.open(
						bytes,
						csr.publicSigningKey,
						`${namespace}:users/${csr.username}/certificateRequest`
					);

					issuanceHistory.publicSigningKeyHashes[
						publicSigningKeyHash
					] = true;
					issuanceHistory.usernames[csr.username] = true;

					return csr;
				}
				catch (_) {}
			})
		)).filter(csr => csr);

		if (csrs.length < 1) {
			console.log('No certificates to sign.');
			if (standalone) {
				process.exit(0);
			}
			else {
				return;
			}
		}

		issuanceHistory.timestamp = Date.now();

		const {rsaIndex, signedInputs, sphincsIndex} = await sign(
			[
				{
					additionalData: `${namespace}:AGSEPKIIssuanceHistory`,
					message: await serialize(
						AGSEPKIIssuanceHistory,
						issuanceHistory
					)
				}
			].concat(
				await Promise.all(
					csrs.map(async csr => ({
						additionalData: `${namespace}:${csr.username}`,
						message: await serialize(AGSEPKICert, {
							agsePKICSR: csr,
							timestamp: issuanceHistory.timestamp
						})
					}))
				)
			),
			testSign
		);

		const signedIssuanceHistory = potassium.concatMemory(
			false,
			new Uint32Array([rsaIndex]),
			new Uint32Array([sphincsIndex]),
			signedInputs[0]
		);

		for (const parentPath of [
			issuanceHistoryParentPath,
			lastIssuanceTimestampParentPath
		]) {
			if (!fs.existsSync(parentPath)) {
				fs.mkdirSync(parentPath);
			}
		}

		fs.writeFileSync(issuanceHistoryPath, signedIssuanceHistory);

		fs.writeFileSync(
			lastIssuanceTimestampPath,
			issuanceHistory.timestamp.toString()
		);

		await setItem(
			namespace,
			'certificateHistory',
			BinaryProto,
			signedIssuanceHistory
		);

		await lastIssuanceTimestampRef.set(issuanceHistory.timestamp);

		const plans = await Promise.all(
			signedInputs.slice(1).map(async (cert, i) => {
				const csr = csrs[i];

				const fullCert = potassium.concatMemory(
					false,
					new Uint32Array([rsaIndex]),
					new Uint32Array([sphincsIndex]),
					cert
				);

				const url = `users/${csr.username}/certificate`;

				await setItem(namespace, url, BinaryProto, fullCert);

				potassium.clearMemory(cert);
				potassium.clearMemory(fullCert);

				return [
					csr.username,
					await getItem(
						namespace,
						`users/${csr.username}/plan`,
						CyphPlan
					)
						.then(o => o.plan)
						.catch(() => CyphPlans.Free)
				];
			})
		);

		await Promise.all([
			addInviteCode(
				projectId,
				plans.reduce(
					(o, [username, plan]) =>
						config.planConfig[plan].initialInvites === undefined ?
							o :
							{
								...o,
								[username]:
									config.planConfig[plan].initialInvites
							},
					{}
				),
				namespace
			),
			...csrs.map(async ({username}) => {
				const url = `users/${username}/certificateRequest`;

				await removeItem(namespace, url);
				await database.ref(`${pendingSignupsURL}/${username}`).remove();
			})
		]);

		console.log('Certificate signing complete.');
		if (standalone) {
			process.exit(0);
		}
	}
	catch (err) {
		console.error(err);
		console.log('Certificate signing failed.');
		if (standalone) {
			process.exit(1);
		}
		else {
			throw err;
		}
	}
};

if (isCLI) {
	certSign(process.argv[2], true, process.argv[3]);
}
