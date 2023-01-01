#!/usr/bin/env node

import {potassiumService as potassium, util} from '@cyph/sdk';
import {agsePublicSigningKeys} from './agse-public-signing-keys.js';

const {deserialize} = util;

export const openAGSEPKICertified = async ({
	additionalData,
	certified,
	expectedAlgorithm,
	expectedTimestamp,
	proto,
	testSign = false
}) => {
	if (
		expectedAlgorithm !== undefined &&
		certified.algorithm !== expectedAlgorithm
	) {
		throw new Error(
			'Invalid AGSE-PKI-certified data: unexpected algorithm.'
		);
	}

	const publicSigningKeysMap = testSign ?
		agsePublicSigningKeys.test :
		agsePublicSigningKeys.prod;

	const publicSigningKeys = publicSigningKeysMap.get(certified.algorithm);

	if (publicSigningKeys === undefined) {
		throw new Error(
			`No AGSE public keys found for algorithm ${
				PotassiumData.SignAlgorithms[certified.algorithm]
			}.`
		);
	}

	if (
		certified.publicKeys.classical >= publicSigningKeys.classical.length ||
		certified.publicKeys.postQuantum >= publicSigningKeys.postQuantum.length
	) {
		throw new Error('Invalid AGSE-PKI-certified data: bad key index.');
	}

	const opened = await deserialize(
		proto,
		await potassium.sign.openRaw(
			certified.data,
			await potassium.sign.importPublicKeys(
				certified.algorithm,
				publicSigningKeys.classical[certified.publicKeys.classical],
				publicSigningKeys.postQuantum[certified.publicKeys.postQuantum]
			),
			additionalData,
			certified.algorithm
		)
	);

	if (
		!testSign &&
		expectedTimestamp !== undefined &&
		opened.timestamp !== expectedTimestamp
	) {
		throw new Error('Invalid AGSE-PKI-certified data: bad timestamp.');
	}

	return opened;
};
