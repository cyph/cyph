#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {potassiumService as potassium, proto, util} from '@cyph/sdk';
import openpgp from 'openpgp';
import {agsePublicSigningKeys} from '../modules/agse-public-signing-keys.js';
import {initDatabaseService} from '../modules/database-service.js';

const {
	AccountUserProfile,
	AccountUserProfileExtra,
	AGSEPKICert,
	AGSEPKICertified,
	CyphPlan,
	CyphPlans,
	PotassiumData,
	StringProto
} = proto;
const {deserialize, normalize} = util;

openpgp.config.versionstring = 'Cyph';
openpgp.config.commentstring = 'https://www.cyph.com';

/* TODO: Refactor this */
const getCertTimestamp = async (user, namespace, getUserItem) => {
	const cert = await getUserItem('publicKeyCertificate', AGSEPKICertified);

	const publicSigningKeys = agsePublicSigningKeys.prod.get(cert.algorithm);

	if (publicSigningKeys === undefined) {
		throw new Error(
			`No AGSE public keys found for algorithm ${
				PotassiumData.SignAlgorithms[cert.algorithm]
			}.`
		);
	}

	if (
		cert.publicKeys.classical >= publicSigningKeys.classical.length ||
		cert.publicKeys.postQuantum >= publicSigningKeys.postQuantum.length
	) {
		throw new Error('Invalid AGSE-PKI certificate: bad key index.');
	}

	const certData = await deserialize(
		AGSEPKICert,
		await potassium.sign.open(
			cert.data,
			await potassium.sign.importPublicKeys(
				cert.algorithm,
				publicSigningKeys.classical[cert.publicKeys.classical],
				publicSigningKeys.postQuantum[cert.publicKeys.postQuantum]
			),
			`${namespace}:${user.username}`,
			false
		)
	);

	if (certData.csrData.username !== user.username) {
		throw new Error('Invalid AGSE-PKI certificate: bad username.');
	}

	return new Date(certData.timestamp).toLocaleString();
};

const processDate = date => ({
	date,
	daysSince: date ? Math.floor((Date.now() - date.getTime()) / 86400000) : -1,
	timestamp: date?.toLocaleString() || 'N/A'
});

export const getUserMetadata = async (
	projectId,
	username,
	namespace,
	inlineDataOnly = false
) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	const providedData =
		username && typeof username === 'object' ? username : undefined;

	username = normalize(providedData?.username || username);

	if (!username) {
		throw new Error('Invalid username.');
	}

	const {auth, database, getItem, hasItem} = initDatabaseService(projectId);

	const user = providedData || {
		...(
			await database
				.ref(`${namespace.replace(/\./g, '_')}/users/${username}`)
				.once('value')
		).val(),
		username
	};

	const getUserItem = async (url, proto, skipSignature, decompress) =>
		getItem(
			namespace,
			{
				...url.split('/').reduce((o, k) => o[k], user),
				url: `users/${user.username}/${url}`
			},
			proto,
			skipSignature,
			decompress,
			inlineDataOnly
		);

	const [
		certIssuanceDate,
		inviteCode,
		inviterUsername,
		{lastLoginDate, signupDate},
		masterKeyConfirmed,
		plan,
		profile,
		profileExtra
	] = await Promise.all([
		getCertTimestamp(user, namespace, getUserItem)
			.then(timestamp => new Date(timestamp))
			.catch(() => undefined),
		getUserItem('inviteCode', StringProto).catch(() => ''),
		getUserItem('inviterUsername', StringProto).catch(() => ''),
		auth
			.getUserByEmail(`${username}@${namespace}`)
			.then(o => ({
				lastLoginDate: o.metadata.lastRefreshTime ?
					new Date(
						Math.max(
							new Date(o.metadata.lastRefreshTime).getTime(),
							new Date(o.metadata.lastSignInTime).getTime()
						)
					) :
					new Date(o.metadata.lastSignInTime),
				signupDate: new Date(o.metadata.creationTime)
			}))
			.catch(() => ({})),
		hasItem(namespace, `users/${username}/masterKeyUnconfirmed`).then(
			b => !b
		),
		getUserItem('plan', CyphPlan)
			.then(o => o.plan)
			.catch(() => CyphPlans.Free)
			.then(value => ({
				name: CyphPlans[value],
				lastChange: processDate(
					!isNaN(user.plan?.timestamp) ?
						new Date(user.plan?.timestamp) :
						undefined
				),
				value
			})),
		getUserItem('publicProfile', AccountUserProfile, true, true).catch(
			() => ({})
		),
		getUserItem(
			'publicProfileExtra',
			AccountUserProfileExtra,
			true,
			true
		).catch(() => ({}))
	]);

	return {
		contactCount: Object.keys(user.contacts || {}).length,
		dates: {
			certIssuance: processDate(certIssuanceDate),
			lastLogin: processDate(lastLoginDate),
			signup: processDate(signupDate)
		},
		internal: user.internal,
		inviteCode,
		inviterUsername,
		masterKeyConfirmed,
		messageCount: Object.values(user.castleSessions || {})
			.map(o => Object.keys(o.messageList || {}).length)
			.reduce((a, b) => a + b, 0),
		pgpPublicKey:
			profileExtra.pgp &&
			profileExtra.pgp.publicKey &&
			profileExtra.pgp.publicKey.length > 0 ?
				(await openpgp.readKey({binaryKey: profileExtra.pgp.publicKey}))
					.toPublic()
					.armor()
					.replace(/\r/g, '')
					.trim() :
				undefined,
		plan,
		profile,
		profileExtra,
		username
	};
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const usernames = process.argv[3].split(' ');
		const namespace = process.argv[4];

		console.dir(
			await Promise.all(
				usernames.map(async username =>
					getUserMetadata(projectId, username, namespace)
				)
			),
			{depth: undefined}
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
