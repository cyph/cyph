#!/usr/bin/env node

import {
	accountDatabaseService,
	potassiumService as potassium,
	proto,
	util
} from '@cyph/sdk';
import {Datastore} from '@google-cloud/datastore';
import isEqual from 'lodash-es/isEqual.js';
import * as brotli from './brotli.js';
import {initDatabaseService} from './database-service.js';
import {getPackageDatabase} from './package-database.js';
import hashWhitelist from './websign-hash-whitelist.json' assert {type: 'json'};
import {getWebSignPermissions} from './websign-permissions.js';

const {
	AGSEPKICertified,
	AGSEPKISigningRequest,
	PotassiumData,
	WebSignPackage,
	WebSignPackageData
} = proto;
const {deserialize, filterUndefined, serialize} = util;

const algorithm = PotassiumData.SignAlgorithms.V2Hardened;

const webSignDatastoreNamespace = 'api.cyph.com';
const webSignNamespace = 'cyph.ws';
const webSignProjectId = 'cyphme';

const webSignNamespacePath = webSignNamespace.replace(/\./g, '_');
const pendingReleasesURL = `${webSignNamespacePath}/webSign/pendingReleases`;

const datastore = new Datastore();
if ((await datastore.getProjectId()) !== webSignProjectId) {
	throw new Error('Invalid GCloud Datastore project.');
}

const {database, getItem} = initDatabaseService(webSignProjectId);

const pendingReleasesRef = database.ref(pendingReleasesURL);

const getDatastoreKey = (kind, name) =>
	datastore.key({
		namespace: webSignDatastoreNamespace,
		path: [kind, name]
	});

const getPendingRelease = async (
	webSignPermissions,
	releaseID,
	{packageName, signingRequests}
) => {
	try {
		if (signingRequests.length < 1) {
			throw new Error('No signing requests.');
		}

		const packageDataObjects = await Promise.all(
			Object.entries(signingRequests).map(
				async ([username, signingRequestBytes]) => {
					if (!signingRequestBytes) {
						throw new Error('Missing signing request.');
					}

					const signingRequest = await deserialize(
						AGSEPKISigningRequest,
						Buffer.from(signingRequestBytes, 'base64')
					);

					const publicKey = (
						await accountDatabaseService.getUserPublicKeys(username)
					).signPublicKeys?.[algorithm];

					if (publicKey === undefined) {
						throw new Error(
							`Missing package signing key for @${username}.`
						);
					}

					const packageData = await deserialize(
						WebSignPackageData,
						await potassium.sign.open(
							signingRequest.data,
							publicKey,
							`${namespace}:webSign/signingRequests/${packageName}`
						)
					);

					if (
						packageData.algorithm !== algorithm ||
						packageData.packageName !== packageName
					) {
						throw new Error('Invalid package data.');
					}

					return {packageData, publicKey, username};
				}
			)
		);

		const packageData = {
			...packageDataObjects[0].packageData,
			signature: undefined
		};

		for (const {packageData: o} of packageDataObjects) {
			if (!isEqual(packageData, {...o, signature: undefined})) {
				throw new Error('Package data mismatch.');
			}
		}

		const signatures = packageDataObjects.map(o => ({
			publicKey: o.publicKey,
			signature: o.packageData.signature,
			username: o.username
		}));

		if (
			!signatures.some(
				({username}) =>
					webSignPermissions.packages[packageName]?.users[username]
			)
		) {
			throw new Error('Missing signature from authorized submitter.');
		}

		return {
			packageData,
			releaseID,
			signatures
		};
	}
	catch (err) {
		console.error({err, packageName, releaseID});
		return undefined;
	}
};

export const generateReleaseSignInput = async ({
	namespace = webSignNamespace,
	projectId = webSignProjectId,
	testSign = false
}) => {
	/* Test signing and alternate environments are unsupported */
	if (
		namespace !== webSignNamespace ||
		projectId !== webSignProjectId ||
		testSign
	) {
		return {signInputs: []};
	}

	const webSignPermissions = await getWebSignPermissions({getItem});

	const pendingReleases = filterUndefined(
		await Promise.all(
			Object.entries(
				(await pendingReleasesRef.once('value')).val() ?? {}
			).map(async ([releaseID, pendingReleaseMetadata]) =>
				getPendingRelease(
					webSignPermissions,
					releaseID,
					pendingReleaseMetadata
				)
			)
		)
	);

	return {
		pendingReleases,
		signInputs: await Promise.all(
			pendingReleases.map(
				async ({packageData, releaseID, signatures}) => ({
					additionalData: `${namespace}:webSign/packages/${packageData.packageName}`,
					algorithm,
					message: await serialize(WebSignPackage, {
						hashWhitelist,
						packageData,
						releaseID,
						signatures
					})
				})
			)
		)
	};
};

export const processReleaseSignOutput = async ({
	certifiedMessages,
	pendingReleases
}) => {
	if (
		certifiedMessages.length < 1 ||
		certifiedMessages.length !== pendingReleases.length
	) {
		return;
	}

	await datastore.save(
		await Promise.all(
			certifiedMessages.flatMap((certifiedMessage, i) => {
				const pendingRelease = pendingReleases[i];

				return [
					{
						data: {
							timestamp: pendingRelease.packageData.timestamp
						},
						key: getDatastoreKey(
							'WebSignPackageTimestamp',
							pendingRelease.packageData.packageName
						)
					},
					getPackageDatabase().then(
						async ({
							[pendingRelease.packageData.packageName]: {
								packageV1: {subresources, subresourceTimeouts}
							}
						}) => ({
							data: {
								data: brotli.encode(
									await serialize(
										AGSEPKICertified,
										certifiedMessage
									)
								),
								subresources,
								subresourceTimeouts,
								timestamp: pendingRelease.packageData.timestamp
							},
							key: getDatastoreKey(
								'WebSignPackageItem',
								pendingRelease.packageData.packageName
							)
						})
					)()
				];
			})
		)
	);
};
