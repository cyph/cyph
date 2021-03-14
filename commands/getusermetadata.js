#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {potassiumService as potassium, proto, util} from '@cyph/sdk';
import fs from 'fs';
import openpgp from 'openpgp';
import {initDatabaseService} from '../modules/database-service.js';

const {
	AccountUserProfile,
	AccountUserProfileExtra,
	AGSEPKICert,
	BinaryProto,
	CyphPlan,
	CyphPlans,
	StringProto
} = proto;
const {normalize} = util;

openpgp.config.versionstring = 'Cyph';
openpgp.config.commentstring = 'https://www.cyph.com';

/* TODO: Refactor this */
const getCertTimestamp = async (username, namespace, getItem) => {
	const agsePublicSigningKeysJS = fs
		.readFileSync(`${__dirname}/../websign/js/keys.js`)
		.toString();

	const agsePublicSigningKeys = JSON.parse(
		agsePublicSigningKeysJS
			.substring(agsePublicSigningKeysJS.indexOf('=') + 1)
			.split(';')[0]
			.trim()
			.replace(/\/\*.*?\*\//g, '')
	);

	const certBytes = await getItem(
		namespace,
		`users/${username}/certificate`,
		BinaryProto
	);

	const dataView = potassium.toDataView(certBytes);
	const rsaKeyIndex = dataView.getUint32(0, true);
	const sphincsKeyIndex = dataView.getUint32(4, true);
	const signed = potassium.toBytes(certBytes, 8);

	if (
		rsaKeyIndex >= agsePublicSigningKeys.rsa.length ||
		sphincsKeyIndex >= agsePublicSigningKeys.sphincs.length
	) {
		throw new Error('Invalid AGSE-PKI certificate: bad key index.');
	}

	const cert = await deserialize(
		AGSEPKICert,
		await potassium.sign.open(
			signed,
			await potassium.sign.importSuperSphincsPublicKeys(
				agsePublicSigningKeys.rsa[rsaKeyIndex],
				agsePublicSigningKeys.sphincs[sphincsKeyIndex]
			),
			`${namespace}:${username}`,
			false
		)
	);

	if (cert.agsePKICSR.username !== username) {
		throw new Error('Invalid AGSE-PKI certificate: bad username.');
	}

	return new Date(cert.timestamp).toLocaleString();
};

export const getUserMetadata = async (projectId, username, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	username = normalize(username);

	const {database, getItem} = initDatabaseService(projectId);

	const [
		certTimestamp,
		internal,
		inviteCode,
		inviterUsername,
		plan,
		profile,
		profileExtra
	] = await Promise.all([
		getCertTimestamp(username, namespace, getItem).catch(() => 'N/A'),
		database
			.ref(`${namespace.replace(/\./g, '_')}/users/${username}/internal`)
			.once('value')
			.then(o => o.val()),
		getItem(namespace, `users/${username}/inviteCode`, StringProto).catch(
			() => ''
		),
		getItem(
			namespace,
			`users/${username}/inviterUsername`,
			StringProto
		).catch(() => ''),
		getItem(namespace, `users/${username}/plan`, CyphPlan)
			.then(o => o.plan)
			.catch(() => CyphPlans.Free),
		getItem(
			namespace,
			`users/${username}/publicProfile`,
			AccountUserProfile,
			true,
			true
		).catch(() => ({})),
		getItem(
			namespace,
			`users/${username}/publicProfileExtra`,
			AccountUserProfileExtra,
			true,
			true
		).catch(() => ({}))
	]);

	return {
		certTimestamp,
		internal,
		inviteCode,
		inviterUsername,
		pgpPublicKey:
			profileExtra.pgp &&
			profileExtra.pgp.publicKey &&
			profileExtra.pgp.publicKey.length > 0 ?
				(await openpgp.key.read(profileExtra.pgp.publicKey)).keys[0]
					.toPublic()
					.armor()
					.replace(/\r/g, '')
					.trim() :
				undefined,
		plan: CyphPlans[plan],
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

		console.log(
			JSON.stringify(
				await Promise.all(
					usernames.map(async username =>
						getUserMetadata(projectId, username, namespace)
					)
				),
				undefined,
				'\t'
			)
		);

		process.exit();
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
