#!/usr/bin/env node

import {proto, util} from '@cyph/sdk';
import read from 'read';
import {openAGSEPKICertified} from './agse-pki-certified.js';
import {webSignPermissionsTimestamp} from './websign-permissions-timestamp.js';

const {AGSEPKICertified, PotassiumData, WebSignPermissions} = proto;
const {serialize} = util;

const algorithm = PotassiumData.SignAlgorithms.V2Hardened;
const namespace = 'cyph.ws';
const additionalData = `${namespace}:webSignPermissions`;
const url = 'webSign/permissions';

const readInput = async prompt =>
	read({
		prompt
	});

export const getWebSignPermissions = async ({getItem, testSign = false}) => {
	try {
		return await openAGSEPKICertified({
			additionalData,
			certified: await getItem(namespace, url, AGSEPKICertified),
			expectedAlgorithm: algorithm,
			expectedTimestamp: webSignPermissionsTimestamp,
			proto: WebSignPermissions,
			testSign
		});
	}
	catch (err) {
		err = new Error(
			`Failed to open WebSign permissions (${
				testSign ? 'test' : 'prod'
			}): ${err}`
		);

		console.error(err);

		if (
			(await readInput(
				`Init WebSign permissions from scratch? [y/N]`
			)) === 'y'
		) {
			return WebSignPermissions.create();
		}

		throw err;
	}
};

export const setWebSignPermissions = async ({
	setItem,
	sign,
	testSign = false,
	webSignPermissions
}) =>
	setItem(
		namespace,
		url,
		AGSEPKICertified,
		(
			await sign(
				[
					{
						additionalData,
						algorithm,
						message: await serialize(
							WebSignPermissions,
							webSignPermissions
						)
					}
				],
				testSign
			)
		)[0]
	);

export const updateWebSignPermissions = async ({
	getItem,
	init = false,
	setItem,
	sign,
	testSign,
	transform
}) => {
	const oldWebSignPermissions = await getWebSignPermissions({
		getItem,
		testSign
	}).catch(err => {
		if (init) {
			return {};
		}
		throw err;
	});

	const newWebSignPermissions = await transform(
		init ? {} : oldWebSignPermissions
	);

	await setWebSignPermissions({
		setItem,
		sign,
		testSign,
		webSignPermissions: newWebSignPermissions
	});

	return {newWebSignPermissions, oldWebSignPermissions};
};
