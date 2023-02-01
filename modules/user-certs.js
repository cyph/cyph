#!/usr/bin/env node

import {
	configService as config,
	potassiumService as potassium,
	proto,
	util
} from '@cyph/sdk';
import fs from 'fs';
import os from 'os';
import read from 'read';
import {openAGSEPKICertified} from './agse-pki-certified.js';
import {agsePublicSigningKeys} from './agse-public-signing-keys.js';
import {initDatabaseService} from './database-service.js';
import {webSignAlgorithm} from './websign-algorithm.js';

const {
	AGSEPKICert,
	AGSEPKICertified,
	AGSEPKICSRData,
	AGSEPKIIssuanceHistory,
	AGSEPKISigningRequest,
	BinaryProto,
	CyphPlan,
	CyphPlans,
	PotassiumData,
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

const getPaths = (namespace, projectId) => {
	const testSign = projectId !== 'cyphme';
	const namespacePath = namespace.replace(/\./g, '_');
	const configDir = `${os.homedir()}/.cyph`;
	const issuanceHistoryParentPath = `${configDir}/certificate-issuance-history`;
	const issuanceHistoryPath = `${issuanceHistoryParentPath}/${projectId}.${namespace}`;
	const lastIssuanceTimestampParentPath = `${configDir}/certificate-issuance-timestamps`;
	const lastIssuanceTimestampPath = `${lastIssuanceTimestampParentPath}/${projectId}.${namespace}`;

	const pendingSignupsURL = `${namespacePath}/pendingSignups`;
	const lastIssuanceTimestampURL = `${namespacePath}/publicKeyCertificateHistoryTimestamp`;

	return {
		configDir,
		issuanceHistoryParentPath,
		issuanceHistoryPath,
		lastIssuanceTimestampParentPath,
		lastIssuanceTimestampPath,
		lastIssuanceTimestampURL,
		namespacePath,
		pendingSignupsURL,
		testSign
	};
};

const readInput = async prompt =>
	read({
		prompt
	});

const duplicateCSRLock = lockFunction();

const duplicateCSR = async (
	issuanceHistory,
	csr,
	publicSigningKeyHash,
	oldCert
) =>
	issuanceHistory.publicSigningKeyHashes[publicSigningKeyHash] ||
	(issuanceHistory.usernames[csr.username] &&
		/* Treat as non-duplicate when upgrading algorithms */
		oldCert?.certified?.algorithm === webSignAlgorithm &&
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

export const generateUserCertSignInput = async ({
	namespace = 'cyph.ws',
	projectId = 'cyphme',
	upgradeCerts = false
}) => {
	if (projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}

	const {
		issuanceHistoryPath,
		lastIssuanceTimestampPath,
		lastIssuanceTimestampURL,
		pendingSignupsURL,
		testSign
	} = getPaths(namespace, projectId);

	/* Will remain hardcoded as true for the duration of the private beta */
	const requireInvite = true;

	const getHash = async bytes =>
		potassium.toBase64(await potassium.hash.hash(bytes));

	const {auth, database, getAllUsers, getItem, hasItem, removeItem} =
		initDatabaseService(projectId);

	const lastIssuanceTimestampRef = database.ref(lastIssuanceTimestampURL);

	const pendingSignups = upgradeCerts ?
		Object.fromEntries((await getAllUsers()).map(k => [k])) :
		(await database.ref(pendingSignupsURL).once('value')).val() || {};

	const usernames = [];

	for (const [username, pendingSignup] of Object.entries(pendingSignups)) {
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
			((await hasItem(namespace, `users/${username}/keyrings/csr`)) ||
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
				).catch(() => undefined)) !== undefined)
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

	const issuanceHistory = await (async () => {
		if (testSign) {
			return {
				publicSigningKeyHashes: {},
				timestamp: 0,
				usernames: {}
			};
		}

		const lastIssuanceTimestampLocal = fs.existsSync(
			lastIssuanceTimestampPath
		) ?
			parseFloat(fs.readFileSync(lastIssuanceTimestampPath).toString()) :
			undefined;

		const lastIssuanceTimestampRemote = (
			await lastIssuanceTimestampRef.once('value')
		).val();

		if (
			isNaN(lastIssuanceTimestampLocal) &&
			isNaN(lastIssuanceTimestampRemote)
		) {
			throw new Error('Invalid AGSE-PKI history: timestamp not found.');
		}

		const lastIssuanceTimestamp =
			!isNaN(lastIssuanceTimestampLocal) &&
			(isNaN(lastIssuanceTimestampRemote) ||
				lastIssuanceTimestampLocal >= lastIssuanceTimestampRemote) ?
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

		return openAGSEPKICertified({
			additionalData: `${namespace}:publicKeyCertificateHistory`,
			certified: await deserialize(
				AGSEPKICertified,
				lastIssuanceTimestamp === lastIssuanceTimestampLocal &&
					fs.existsSync(issuanceHistoryPath) ?
					fs.readFileSync(issuanceHistoryPath) :
					await getItem(
						namespace,
						'publicKeyCertificateHistory',
						BinaryProto
					)
			),
			expectedAlgorithm: algorithms.issuanceHistory,
			expectedMinimumTimestamp: lastIssuanceTimestamp,
			proto: AGSEPKIIssuanceHistory
		});
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

	const openCertificateRequest = async username => {
		const csrURL = `users/${username}/keyrings/csr`;

		const csr = await getItem(namespace, csrURL, AGSEPKISigningRequest);
		let csrDataBytes = csr.data;

		/* In the case of a reissue, an outer signature from the previous key is applied */
		if (pendingSignups[username].reissue) {
			const oldCert = (await hasItem(
				namespace,
				`users/${username}/publicKeyCertificate`
			)) ?
				await openCertificate(username) :
				await openLegacyCertificate(username);

			csrDataBytes = await potassium.sign.open(
				csrDataBytes,
				oldCert.csrData.publicSigningKey,
				`${namespace}:${csrURL}/previous-key`
			);
		}

		const csrPotassiumSigned = await potassium.encoding.deserialize(
			{signAlgorithm: csr.algorithm},
			{
				signed: {
					compressed: false,
					defaultSignatureBytes: await potassium.sign.getBytes(
						csr.algorithm
					),
					message: new Uint8Array(0),
					signature: csrDataBytes
				}
			}
		);

		const csrData = await deserialize(
			AGSEPKICSRData,
			csrPotassiumSigned.signed.message
		);

		if (
			csrData.publicSigningKey === undefined ||
			csrData.publicSigningKey.length < 1 ||
			csrData.username !== username
		) {
			throw new Error('Invalid CSR.');
		}

		/* Validate CSR signature */
		await potassium.sign.open(
			csrDataBytes,
			csrData.publicSigningKey,
			`${namespace}:${csrURL}`
		);

		return csrData;
	};

	const openCertificate = async username => {
		const certURL = `users/${username}/publicKeyCertificate`;

		const certified = await getItem(namespace, certURL, AGSEPKICertified);
		const {csrData} = await openAGSEPKICertified({
			additionalData: `${namespace}:${certURL}`,
			certified,
			proto: AGSEPKICert,
			testSign
		});

		if (csrData.username !== username) {
			throw new Error('Invalid AGSE-PKI certificate: bad username.');
		}

		return {certified, csrData};
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
			rsa: publicSigningKeysMap.get(algorithms.legacy)?.classical ?? [],
			sphincs:
				publicSigningKeysMap.get(algorithms.legacy)?.postQuantum ?? []
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
					algorithms.legacy,
					publicSigningKeys.rsa[rsaKeyIndex],
					publicSigningKeys.sphincs[sphincsKeyIndex]
				),
				`${namespace}:${username}`,
				algorithms.legacy
			)
		);

		return {csrData};
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

					const oldCert = (async () => {
						try {
							return (await hasItem(
								namespace,
								`users/${username}/publicKeyCertificate`
							)) ?
								await openCertificate(username) :
								await openLegacyCertificate(username);
						}
						catch (err) {
							console.error(err);
							return undefined;
						}
					})();

					const csrData = upgradeCerts ?
						oldCert?.csrData :
					(await hasItem(
							namespace,
							`users/${username}/keyrings/csr`
						)) ?
						await openCertificateRequest(username) :
						await openLegacyCertificateRequest(username);

					if (csrData === undefined) {
						throw new Error('Missing CSR data.');
					}

					const publicSigningKeyHash = await getHash(
						csrData.publicSigningKey
					);

					/* Validate that CSR data doesn't already belong to an existing user */
					if (
						await duplicateCSR(
							issuanceHistory,
							csrData,
							publicSigningKeyHash,
							oldCert
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

	let signInputs = [];

	if (csrDataObjects.length > 0) {
		issuanceHistory.timestamp = Date.now();

		signInputs = [
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
		];
	}
	else {
		console.log('No user certificates to sign.');
	}

	return {
		lastIssuanceTimestamp: issuanceHistory.timestamp,
		namespace,
		projectId,
		signInputs,
		testSign,
		usernames: csrDataObjects.map(({username}) => username)
	};
};

export const processUserCertSignOutput = async ({
	addInviteCode,
	certifiedMessages,
	lastIssuanceTimestamp,
	namespace,
	projectId,
	usernames
}) => {
	/* Must include updated issuance history + user certs */
	if (
		certifiedMessages.length < 2 ||
		certifiedMessages.length !== usernames.length + 1
	) {
		return;
	}

	const {
		issuanceHistoryParentPath,
		issuanceHistoryPath,
		lastIssuanceTimestampParentPath,
		lastIssuanceTimestampPath,
		lastIssuanceTimestampURL,
		pendingSignupsURL
	} = getPaths(namespace, projectId);

	const {database, getItem, removeItem, setItem} =
		initDatabaseService(projectId);

	const lastIssuanceTimestampRef = database.ref(lastIssuanceTimestampURL);

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
		lastIssuanceTimestamp.toString()
	);

	await setItem(
		namespace,
		'publicKeyCertificateHistory',
		BinaryProto,
		signedIssuanceHistory
	);

	await lastIssuanceTimestampRef.set(lastIssuanceTimestamp);

	const plans = await Promise.all(
		certifiedMessages.slice(1).map(async (cert, i) => {
			const username = usernames[i];

			const url = `users/${username}/publicKeyCertificate`;

			await setItem(namespace, url, AGSEPKICertified, cert);

			return [
				username,
				await getItem(namespace, `users/${username}/plan`, CyphPlan)
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
							[username]: config.planConfig[plan].initialInvites
						},
				{}
			),
			namespace
		),
		...usernames.map(async username => {
			const url = `users/${username}/keyrings/csr`;

			await removeItem(namespace, url);
			await database
				.ref(`${pendingSignupsURL}/${username}`)
				.remove()
				.catch(() => {});
		})
	]);
};
