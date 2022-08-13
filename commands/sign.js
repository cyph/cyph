#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {potassiumService as potassium, proto} from '@cyph/sdk';
import crypto from 'crypto';
import dgram from 'dgram';
import fs from 'fs';
import memoize from 'lodash-es/memoize.js';
import read from 'read';
import superDilithium from 'superdilithium';
import oldSuperSphincs from 'supersphincs-legacy/dist/old-api.js';
import superSphincs from 'supersphincs';
import {agsePublicSigningKeys} from '../modules/agse-public-signing-keys.js';
import {testAgseSigningKeys} from '../modules/test-agse-signing-keys.js';
import {notify} from './notify.js';

const {PotassiumData} = proto;

const algorithmImplementations = {
	[PotassiumData.SignAlgorithms.V1]: oldSuperSphincs,
	[PotassiumData.SignAlgorithms.V2]: superDilithium,
	[PotassiumData.SignAlgorithms.V2Hardened]: superSphincs
};

const defaultAlgorithm = PotassiumData.SignAlgorithms.V2;

const remoteAddress = '10.0.0.42';
const port = 31337;
const chunkSize = 576;

const macAddress = Buffer.from(
	fs
		.readFileSync(`${process.env.HOME}/.cyph/agse.local.mac`)
		.toString()
		.trim()
);

export const sign = async (inputs, testSign, demoSign, skipNotify = false) =>
	new Promise(async (resolve, reject) => {
		for (const input of inputs) {
			input.algorithm = input.algorithm ?? defaultAlgorithm;
		}

		if (testSign) {
			resolve(
				await Promise.all(
					inputs.map(
						async ({additionalData, algorithm, message}) => ({
							algorithm,
							data: Buffer.from(
								await algorithmImplementations[algorithm].sign(
									message,
									testAgseSigningKeys.get(algorithm)
										.privateKey,
									additionalData
								)
							),
							publicKeys: {
								classical: 0,
								postQuantum: 0
							}
						})
					)
				)
			);

			return;
		}

		if (!skipNotify) {
			await notify('Starting signing process');
		}

		const publicKeys = demoSign ?
			agsePublicSigningKeys.demo :
			agsePublicSigningKeys.prod;

		const binaryInputs = inputs.map(
			({additionalData, algorithm, message}) => ({
				additionalData,
				algorithm,
				message:
					message instanceof Uint8Array ?
						message :
						Buffer.from(message)
			})
		);

		const dataToSign = Buffer.from(
			JSON.stringify(
				await Promise.all(
					inputs.map(async o => ({
						additionalData:
							o.additionalData instanceof Uint8Array ?
								{
									data: potassium.toBase64(o.additionalData),
									isUint8Array: true
								} :
							o.additionalData === undefined ?
								{none: true} :
								o.additionalData,
						algorithm: o.algorithm,
						message:
							o.message instanceof Uint8Array ?
								{
									data: potassium.toBase64(
										await potassium.hash.hash(o.message)
									),
									isBinaryHash: true
								} :
								o.message
					}))
				)
			)
		);

		const id = new Uint32Array(crypto.randomBytes(4).buffer)[0];
		const client = dgram.createSocket('udp4');
		const server = dgram.createSocket('udp4');

		let incoming;
		server.on('message', async message => {
			const metadata = new Uint32Array(message.buffer, 0, 3);

			if (metadata[0] !== id) {
				return;
			}

			const numBytes = metadata[1];
			const chunkIndex = metadata[2];

			const numChunks = Math.ceil(numBytes / chunkSize);

			if (!incoming) {
				console.log('Receiving signature data.');

				incoming = {
					chunksReceived: {},
					data: new Uint8Array(numBytes)
				};
			}

			if (!incoming.chunksReceived[chunkIndex]) {
				incoming.data.set(
					new Uint8Array(message.buffer, 12),
					chunkIndex
				);

				incoming.chunksReceived[chunkIndex] = true;
			}

			if (Object.keys(incoming.chunksReceived).length === numChunks) {
				server.close();

				const signatureData = JSON.parse(
					Buffer.from(incoming.data.buffer).toString()
				);

				const baseGetIndex = (k, errorStringType) =>
					memoize(algorithm => {
						const index = publicKeys
							.get(algorithm)
							[k].indexOf(signatureData.publicKeys[k][algorithm]);

						if (index < 0) {
							throw new Error(
								`${errorStringType} public key not found for SignAlgorithms.${PotassiumData.SignAlgorithms[algorithm]}`
							);
						}

						return index;
					});

				const classicalIndex = baseGetIndex('classical', 'Classical');
				const postQuantumIndex = baseGetIndex(
					'postQuantum',
					'Post-quantum'
				);

				const signedInputs = binaryInputs.map(
					({additionalData, algorithm, message}, i) => ({
						additionalData,
						algorithm,
						signed: Buffer.concat([
							Buffer.from(signatureData.signatures[i], 'base64'),
							message
						])
					})
				);

				try {
					const getPublicKey = memoize(
						async algorithm =>
							(
								await algorithmImplementations[
									algorithm
								].importKeys({
									public: {
										classical:
											publicKeys.get(algorithm).classical[
												classicalIndex(algorithm)
											],
										postQuantum:
											publicKeys.get(algorithm)
												.postQuantum[
												postQuantumIndex(algorithm)
											]
									}
								})
							).publicKey
					);

					const openedInputs = await Promise.all(
						signedInputs.map(
							async ({additionalData, algorithm, signed}) =>
								algorithmImplementations[algorithm].open(
									signed,
									await getPublicKey(algorithm),
									additionalData
								)
						)
					);

					if (
						binaryInputs.filter(
							({message}, i) =>
								openedInputs[i].length !== message.length ||
								!potassium.compareMemory(
									openedInputs[i],
									message
								)
						).length > 0
					) {
						throw new Error('Incorrect signed data.');
					}

					console.log('Signing complete.');

					resolve(
						signedInputs.map(({algorithm, signed}) => ({
							algorithm,
							data: signed,
							publicKeys: {
								classical: classicalIndex(algorithm),
								postQuantum: postQuantumIndex(algorithm)
							}
						}))
					);
				}
				catch (err) {
					console.error('Invalid signatures.');
					reject(err);
				}
			}
		});

		server.bind(port);

		const sendData = i => {
			if (incoming) {
				return;
			}
			else if (i >= dataToSign.length) {
				i = 0;
			}

			const data = Buffer.concat([
				Buffer.from(
					new Uint32Array([id, dataToSign.length, chunkSize, i])
						.buffer
				),
				macAddress,
				dataToSign.subarray(
					i,
					Math.min(i + chunkSize, dataToSign.length)
				)
			]);

			client.send(data, 0, data.length, port, remoteAddress);

			setTimeout(() => sendData(i + chunkSize), 10);
		};

		sendData(0);

		read(
			{
				prompt: 'Press enter to retry signing.'
			},
			err => {
				if (err instanceof Error) {
					console.error(err);
					process.exit(1);
				}

				incoming = {chunksReceived: {}, data: new Uint8Array(0)};
				server.close();
				reject();
			}
		);
	}).catch(async () => sign(inputs, testSign, demoSign, true));

if (isCLI) {
	(async () => {
		const args = process.argv.slice(2);
		const inputs = args[0];
		const testSign = args[1] === '--test';
		const demoSign = args[1] === '--demo';

		if (typeof inputs !== 'string' || !inputs) {
			throw './sign.js \'{"message": "data to sign"}\'';
		}

		const certifiedMessages = await sign(
			JSON.parse(inputs),
			testSign,
			demoSign
		);

		console.log(
			certifiedMessages.map(({algorithm, data, publicKeys}) => ({
				algorithm: PotassiumData.SignAlgorithms[algorithm],
				data: data.toString('base64'),
				publicKeys
			}))
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
