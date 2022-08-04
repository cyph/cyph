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
import {agsePublicSigningKeys} from '../modules/agse-public-signing-keys.js';
import {initDatabaseService} from '../modules/database-service.js';
import {addInviteCode} from './addinvitecode.js';
import {sign} from './sign.js';

const {
	AGSEPKICert,
	AGSEPKICertified,
	AGSEPKICSR,
	AGSEPKICSRData,
	AGSEPKIIssuanceHistory,
	BinaryProto,
	CyphPlan,
	CyphPlans,
	StringProto
} = proto;
const {
	deserialize,
	filterUndefined,
	lockFunction,
	normalize,
	serialize,
	sleep
} = util;

const algorithms = {
	certificates: PotassiumData.SignAlgorithms.V2,
	issuanceHistory: PotassiumData.SignAlgorithms.V2Hardened,
	legacy: PotassiumData.SignAlgorithms.V1
};

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

export const certSign = async (
	projectId,
	standalone,
	namespace,
	upgradeCerts
) => {
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
		const issuanceHistoryParentPath = `${configDir}/certificate-issuance-history`;
		const issuanceHistoryPath = `${issuanceHistoryParentPath}/${projectId}.${namespace}`;
		const lastIssuanceTimestampParentPath = `${configDir}/certificate-issuance-timestamps`;
		const lastIssuanceTimestampPath = `${lastIssuanceTimestampParentPath}/${projectId}.${namespace}`;

		/* Will remain hardcoded as true for the duration of the private beta */
		const requireInvite = true;

		const getHash = async bytes =>
			potassium.toBase64(await potassium.hash.hash(bytes));

		const {
			auth,
			database,
			getAllUsers,
			getItem,
			hasItem,
			removeItem,
			setItem
		} = initDatabaseService(projectId);

		const namespacePath = namespace.replace(/\./g, '_');

		const lastIssuanceTimestampRef = database.ref(
			`${namespacePath}/publicKeyCertificateHistoryTimestamp`
		);

		const pendingSignupsURL = `${namespacePath}/pendingSignups`;

		const pendingSignups = upgradeCerts ?
			Object.fromEntries((await getAllUsers()).map(k => [k])) :
			(await database.ref(pendingSignupsURL).once('value')).val() || {};

		const usernames = [];

		for (const [username, pendingSignup] of Object.entries(
			pendingSignups
		)) {
			if (upgradeCerts) {
				if (
					(await hasItem(
						namespace,
						`users/${username}/publicKeyCertificate`
					)) ||
					/* TODO: Remove this after reissuing certificates */
					(await hasItem(namespace, `users/${username}/certificate`))
				) {
					usernames.push(username);
				}

				continue;
			}

			/*
				Process cert signing for user if they:

				* Have submitted a CSR

				* Have confirmed their master key

				* Used a valid invite code (if required)
			*/
			if (
				((await hasItem(
					namespace,
					`users/${username}/publicKeyCertificateRequest`
				)) ||
					/* TODO: Remove this after reissuing certificates */
					(await hasItem(
						namespace,
						`users/${username}/certificateRequest`
					))) &&
				(!requireInvite ||
					(await getItem(
						namespace,
						`users/${username}/inviterUsernamePlaintext`,
						StringProto
					).catch(() => ' ')) !== ' ')
			) {
				if (
					await hasItem(
						namespace,
						`users/${username}/masterKeyUnconfirmed`
					)
				) {
					continue;
				}
				else {
					usernames.push(username);
				}
			}
			/* Otherwise, if signup has been pending for at least 3 hours, delete the user */
			else if (
				pendingSignup !== undefined &&
				Date.now() - pendingSignup.timestamp > 10800000
			) {
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

		const issuanceHistory = await (async () => {
			if (testSign) {
				return {
					publicSigningKeyHashes: {},
					timestamp: 0,
					usernames: {}
				};
			}

			const lastIssuanceTimestampLocal = parseFloat(
				fs.readFileSync(lastIssuanceTimestampPath).toString()
			);

			const lastIssuanceTimestampRemote = (
				await lastIssuanceTimestampRef.once('value')
			).val();

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

			const history = await deserialize(
				AGSEPKICertified,
				lastIssuanceTimestamp === lastIssuanceTimestampLocal &&
					fs.existsSync(issuanceHistoryPath) ?
					fs.readFileSync(issuanceHistoryPath) :
					await getItem(
						namespace,
						'publicKeyCertificateHistory',
						BinaryProto
					)
			);

			const publicSigningKeys = agsePublicSigningKeys.prod.get(
				history.algorithm
			);

			if (
				history.publicKeys.classical >=
					publicSigningKeys.classical.length ||
				history.publicKeys.postQuantum >=
					publicSigningKeys.postQuantum.length
			) {
				throw new Error('Invalid AGSE-PKI history: bad key index.');
			}

			const historyData = await deserialize(
				AGSEPKIIssuanceHistory,
				await potassium.sign.openRaw(
					history.data,
					await potassium.sign.importPublicKeys(
						history.algorithm,
						publicSigningKeys.classical[
							history.publicKeys.classical
						],
						publicSigningKeys.postQuantum[
							history.publicKeys.postQuantum
						]
					),
					`${namespace}:publicKeyCertificateHistory`,
					history.algorithm
				)
			);

			if (historyData.timestamp !== lastIssuanceTimestamp) {
				throw new Error('Invalid AGSE-PKI history: bad timestamp.');
			}

			return historyData;
		})().catch(() => ({
			publicSigningKeyHashes: {},
			timestamp: 0,
			usernames: {}
		}));

		if (
			!testSign &&
			Object.keys(issuanceHistory.usernames).length < 1 &&
			(await readInput(
				`Init AGSE-PKI issuance history from scratch? [y/N]`
			)) !== 'y'
		) {
			throw new Error('Failed to get AGSE-PKI history.');
		}

		const publicSigningKeysMap = testSign ?
			agsePublicSigningKeys.test :
			agsePublicSigningKeys.prod;

		const openCertificateRequest = async username => {
			const csrURL = `users/${username}/publicKeyCertificateRequest`;

			const csr = await getItem(namespace, csrURL, AGSEPKICSR);

			const csrPotassiumSigned = await potassium.deserialize(
				{signAlgorithm: csr.algorithm},
				{
					signed: {
						compressed: false,
						message: new Uint8Array(0),
						signature: csr.data,
						signatureBytes: await potassium.sign.getBytes(
							csr.algorithm
						)
					}
				}
			);

			const csrData = await deserialize(
				AGSEPKICSRData,
				csrPotassiumSigned.signed.message
			);

			if (
				!csrData.publicSigningKey ||
				csrData.publicSigningKey.length < 1 ||
				!csrData.username ||
				csrData.username !== username
			) {
				throw new Error('Invalid CSR.');
			}

			/* Validate CSR signature */
			await potassium.sign.open(
				csr.data,
				csrData.publicSigningKey,
				`${namespace}:${csrURL}`
			);

			return csr;
		};

		const openCertificate = async username => {
			const certURL = `users/${username}/publicKeyCertificate`;

			const cert = await getItem(namespace, certURL, AGSEPKICertified);

			const publicSigningKeys = publicSigningKeysMap.get(cert.algorithm);

			if (publicSigningKeys === undefined) {
				throw new Error(
					`No AGSE public keys found for algorithm ${
						PotassiumData.SignAlgorithms[cert.algorithm]
					}.`
				);
			}

			if (
				cert.publicKeys.classical >=
					publicSigningKeys.classical.length ||
				cert.publicKeys.postQuantum >=
					publicSigningKeys.postQuantum.length
			) {
				throw new Error('Invalid AGSE-PKI certificate: bad key index.');
			}

			const {csrData} = await deserialize(
				AGSEPKICert,
				await potassium.sign.openRaw(
					cert.data,
					await potassium.sign.importPublicKeys(
						cert.algorithm,
						publicSigningKeys.classical[cert.publicKeys.classical],
						publicSigningKeys.postQuantum[
							cert.publicKeys.postQuantum
						]
					),
					`${namespace}:${certURL}`,
					cert.algorithm
				)
			);

			return csrData;
		};

		/* TODO: Remove this after reissuing certificates */
		const openLegacyCertificateRequest = async username => {
			const csrURL = `users/${username}/certificateRequest`;

			const csrBytes = await getItem(namespace, csrURL, BinaryProto);

			const csrData = await deserialize(
				AGSEPKICSRData,
				new Uint8Array(
					csrBytes.buffer,
					csrBytes.byteOffset + (await potassium.sign.bytes)
				)
			);

			if (
				!csrData.publicSigningKey ||
				csrData.publicSigningKey.length < 1 ||
				!csrData.username ||
				csrData.username !== username
			) {
				throw new Error('Invalid CSR.');
			}

			/* Validate CSR signature */
			await potassium.sign.open(
				csrBytes,
				csrData.publicSigningKey,
				`${namespace}:${csrURL}`
			);

			return csrData;
		};

		/* TODO: Remove this after reissuing certificates */
		const openLegacyCertificate = async username => {
			const certURL = `users/${username}/certificate`;

			const certBytes = await getItem(namespace, certURL, BinaryProto);

			const dataView = potassium.toDataView(certBytes);
			const rsaKeyIndex = dataView.getUint32(0, true);
			const sphincsKeyIndex = dataView.getUint32(4, true);
			const signed = potassium.toBytes(certBytes, 8);

			const publicSigningKeys = {
				rsa:
					publicSigningKeysMap.get(algorithms.legacy)?.classical ??
					[],
				sphincs:
					publicSigningKeysMap.get(algorithms.legacy)?.postQuantum ??
					[]
			};

			if (
				rsaKeyIndex >= publicSigningKeys.rsa.length ||
				sphincsKeyIndex >= publicSigningKeys.sphincs.length
			) {
				throw new Error('Invalid AGSE-PKI certificate: bad key index.');
			}

			const {csrData} = await deserialize(
				AGSEPKICert,
				await potassium.sign.openRaw(
					signed,
					await potassium.sign.importPublicKeys(
						publicSigningKeys.rsa[rsaKeyIndex],
						publicSigningKeys.sphincs[sphincsKeyIndex]
					),
					`${namespace}:${username}`,
					algorithms.legacy
				)
			);

			return csrData;
		};

		const csrDataObjects = filterUndefined(
			await Promise.all(
				usernames.map(async username => {
					try {
						if (
							!username ||
							username !== normalize(username).slice(0, 50)
						) {
							throw new Error('Invalid username.');
						}

						const csrData = !upgradeCerts ?
							(await hasItem(
									namespace,
									`users/${username}/publicKeyCertificateRequest`
							  )) ?
								await openCertificateRequest() :
								await openLegacyCertificateRequest() :
						(await hasItem(
								namespace,
								`users/${username}/publicKeyCertificate`
							)) ?
							await openCertificate() :
							await openLegacyCertificate();

						const publicSigningKeyHash = await getHash(
							csrData.publicSigningKey
						);

						/* Validate that CSR data doesn't already belong to an existing user */
						if (
							await duplicateCSR(
								issuanceHistory,
								csrData,
								publicSigningKeyHash
							)
						) {
							console.log(
								`Ignoring duplicate CSR for ${csrData.username}.`
							);
							return;
						}

						issuanceHistory.publicSigningKeyHashes[
							publicSigningKeyHash
						] = true;
						issuanceHistory.usernames[csrData.username] = true;

						return csrData;
					}
					catch (_) {}
				})
			)
		);

		if (csrDataObjects.length < 1) {
			console.log('No certificates to sign.');
			if (standalone) {
				process.exit(0);
			}
			else {
				return;
			}
		}

		issuanceHistory.timestamp = Date.now();

		const certifiedMessages = await sign(
			[
				{
					additionalData: `${namespace}:publicKeyCertificateHistory`,
					algorithm: algorithms.issuanceHistory,
					message: await serialize(
						AGSEPKIIssuanceHistory,
						issuanceHistory
					)
				},
				...(await Promise.all(
					csrDataObjects.map(async csrData => ({
						additionalData: `${namespace}:users/${csrData.username}/publicKeyCertificate`,
						algorithm: algorithms.certificates,
						message: await serialize(AGSEPKICert, {
							csrData,
							timestamp: issuanceHistory.timestamp
						})
					}))
				))
			],
			testSign
		);

		const signedIssuanceHistory = await serialize(
			AGSEPKICertified,
			certifiedMessages[0]
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
			'publicKeyCertificateHistory',
			BinaryProto,
			signedIssuanceHistory
		);

		await lastIssuanceTimestampRef.set(issuanceHistory.timestamp);

		const plans = await Promise.all(
			certifiedMessages.slice(1).map(async (cert, i) => {
				const csrData = csrDataObjects[i];

				const url = `users/${csrData.username}/publicKeyCertificate`;

				await setItem(namespace, url, AGSEPKICertified, cert);

				return [
					csrData.username,
					await getItem(
						namespace,
						`users/${csrData.username}/plan`,
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
			...csrDataObjects.map(async ({username}) => {
				const url = `users/${username}/publicKeyCertificateRequest`;

				await removeItem(namespace, url);
				await database
					.ref(`${pendingSignupsURL}/${username}`)
					.remove()
					.catch(() => {});
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
	certSign(
		process.argv[2],
		true,
		process.argv[3],
		process.argv[4] === '--upgrade-certs'
	);
}
