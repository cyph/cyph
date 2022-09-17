#!/usr/bin/env node

import {potassiumService as potassium, proto, util} from '@cyph/sdk';
import {agsePublicSigningKeys} from './agse-public-signing-keys.js';
import {webSignPermissionsTimestamp} from './websign-permissions-timestamp.js';

const {AGSEPKICertified, PotassiumData, WebSignPermissions} = proto;
const {deserialize, serialize} = util;

const algorithm = PotassiumData.SignAlgorithms.V2Hardened;
const namespace = 'cyph.ws';
const additionalData = `${namespace}:webSignPermissions`;
const url = 'webSign/permissions';

export const getWebSignPermissions = async getItem => {
	const certified = await getItem(namespace, url, AGSEPKICertified);

	if (certified.algorithm !== algorithm) {
		throw new Error('Invalid WebSign permissions: invalid algorithm.');
	}

	const publicSigningKeys = agsePublicSigningKeys.prod.get(algorithm);

	if (
		certified.publicKeys.classical >= publicSigningKeys.classical.length ||
		certified.publicKeys.postQuantum >= publicSigningKeys.postQuantum.length
	) {
		throw new Error('Invalid WebSign permissions: bad key index.');
	}

	const webSignPermissions = await deserialize(
		WebSignPermissions,
		await potassium.sign.openRaw(
			certified.data,
			await potassium.sign.importPublicKeys(
				algorithm,
				publicSigningKeys.classical[certified.publicKeys.classical],
				publicSigningKeys.postQuantum[certified.publicKeys.postQuantum]
			),
			additionalData,
			algorithm
		)
	);

	if (webSignPermissions.timestamp !== webSignPermissionsTimestamp) {
		throw new Error('Invalid WebSign permissions: bad timestamp.');
	}

	return webSignPermissions;
};

export const setWebSignPermissions = async (
	setItem,
	sign,
	webSignPermissions
) =>
	setItem(
		namespace,
		url,
		AGSEPKICertified,
		(
			await sign([
				{
					additionalData,
					algorithm,
					message: await serialize(
						WebSignPermissions,
						webSignPermissions
					)
				}
			])
		)[0]
	);

export const updateWebSignPermissions = async (getItem, setItem, sign, f) =>
	setWebSignPermissions(
		setItem,
		sign,
		await f(await getWebSignPermissions(getItem))
	);
