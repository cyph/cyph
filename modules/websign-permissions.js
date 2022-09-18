#!/usr/bin/env node

import {proto, util} from '@cyph/sdk';
import {openAGSEPKICertified} from './agse-pki-certified.js';
import {webSignPermissionsTimestamp} from './websign-permissions-timestamp.js';

const {AGSEPKICertified, PotassiumData, WebSignPermissions} = proto;
const {serialize} = util;

const algorithm = PotassiumData.SignAlgorithms.V2Hardened;
const namespace = 'cyph.ws';
const additionalData = `${namespace}:webSignPermissions`;
const url = 'webSign/permissions';

export const getWebSignPermissions = async ({getItem}) =>
	openAGSEPKICertified({
		additionalData,
		certified: await getItem(namespace, url, AGSEPKICertified),
		expectedAlgorithm: algorithm,
		expectedTimestamp: webSignPermissionsTimestamp,
		proto: WebSignPermissions
	});

export const setWebSignPermissions = async ({
	setItem,
	sign,
	webSignPermissions
}) =>
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

export const updateWebSignPermissions = async ({
	getItem,
	init = false,
	setItem,
	sign,
	transform
}) => {
	const oldWebSignPermissions = await getWebSignPermissions({getItem}).catch(
		err => {
			if (init) {
				return {};
			}
			throw err;
		}
	);

	const newWebSignPermissions = await transform(
		init ? {} : oldWebSignPermissions
	);

	await setWebSignPermissions({
		setItem,
		sign,
		webSignPermissions: newWebSignPermissions
	});

	return {newWebSignPermissions, oldWebSignPermissions};
};
