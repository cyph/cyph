#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import childProcess from 'child_process';
import crypto from 'crypto';
import dgram from 'dgram';
import fs from 'fs';
import read from 'read';
import sodiumUtil from 'sodiumutil';
import superSphincs from 'supersphincs';

// Temporary workaround pending AGSE update to SuperSPHINCS v6
import oldSuperSphincs from '/home/gibson/oldsupersphincs/node_modules/supersphincs';

const remoteAddress = '10.0.0.42';
const port = 31337;
const chunkSize = 576;

// const interfaces = os.networkInterfaces();
const macAddress = Buffer.from(
	fs
		.readFileSync(`${process.env.HOME}/.cyph/agse.local.mac`)
		.toString()
		.trim()
);

const testKeyPair = {
	privateKey: sodiumUtil.from_base64(
		'eyJhbGciOiJSUzI1NiIsImQiOiJacU94bGlDLThycXBCbV9mdGxKUEwzMWcxV00ySklGMXVvWDV4VFg' +
			'wQTFfaHBqcXZCbWhra3VHMkxXZTJERTZBSXlkd3VvZjM4dU1RUUtqVFJ6bXJfTVh2SlRic0g1Wnh6Vk' +
			'M5bXdkVi0xRnpXWjJhVGdxVy11QlRfcXpsMVdNci03X3Q2TVBZeE12Q2otR2FfbGhhT3huSzV5cEdvS' +
			'WNsT0h0S3ZWRWhyQVdoN0UxT1hfNzZrNGRRV0NGajBxNGVGUjRrTkFNaXkwVXJzV3JkUTQyQnpSMVpI' +
			'WXVlbk9WSWRaQ01IdXZRTGVFcEhUd2FWbjJ3dlVERzl4cVdpdVFGVllFZzg0eDlvTWJxRE5hb081YS1' +
			'vR0IyTE1TU0JLbWt6cjBfUWpGRzlLS2s5OVEzX0ZXel92UTZIYzdjMzk5WjB5VmMyNDI3bnFRNUkxcX' +
			'JRQ25KUlEiLCJkcCI6IkVrSWxPUmtaRTY3SHZmLTRjNWJEaTI2OHdUOUlmcXdiWUFjUk9JS1ZUblNlb' +
			'FJEXzJ0blh2SmpGWENuM29qYm9pMlM1amZzM0g3RmNtSW5DTTZHMTN5X3cwX3NIMEhLSFoxN1JyVzZs' +
			'UTI4OEhlN1ZyT29GWFJmaGR4clFqVWw1TG9RaDFwNm5XM3FFTmkycUwzY1RCUWtqZ3U3aWVKSkFCSER' +
			'sbE1SdDNkayIsImRxIjoiTENuUUMtSGhrU1JVWEdLZzNIM1plZndfcUlkOGs1bDlid25HdmtZbHl2an' +
			'pJN3JFMFpvUU1vdXlwUHJHNTdrRHVVS0JtY0JvX2JfRDc4b2VxZVRSbkhITEt6WXpBUHJkRFI5eFB5Z' +
			'XRRb3owMWo1bUpvSGxSTWRnT1lyR1hfaF81TllCa191WWp4RldMaGJVQjBYWlczNE1SQUgxcmJaQUNa' +
			'TkFwTEN5UUZVIiwiZSI6IkFRQUIiLCJleHQiOnRydWUsImtleV9vcHMiOlsic2lnbiJdLCJrdHkiOiJ' +
			'SU0EiLCJuIjoidkVUOG1HY24zcWFyN1FfaXo1MVZjUmNKdHRFSG5VcWNmN1VybTVueko4bG80Q2RjQT' +
			'ZLN2dRMDl6bmx4a3NQLTg1RE1NSGdwU29mcU1BY2l6UTVmNW5McGxydEtJX0dtdFJ1T1k2d3RHZnZLc' +
			'jNNX3pWMGxVYVFKSXEyVmg0aTU0ZHo1akp6QTZwWmp4eU91V01VdnJmSXZrWVg5LUl2MTBxMTEwYm9w' +
			'aGNmRGpNVTFQbTNZeUlVQzhjSEk2TmN0ZGVOV3dzTEg2WkgwbVdQYTgxZUw2bWtyVzBUZkt1Q1ZEaDB' +
			'FckVCWkJJUUx5TmV1dF9jb2JxR0NoS0V6Y0xVMll6MUUwR19DbkRLVHVYVG5nNEVUQ0FYakhDUXJwaU' +
			'p1aV81UG9SUGdhT0xvcEdKV0RmQXkxMF8yX3ZIeGxab3hrNWFxREx2Z3B3Ny1fdHVTNWRzNmlRIiwic' +
			'CI6IjNNWmFGWFZ0bmJfczlITXNqZ25JanZCVDRsYjljb1VhZE5fQWYtVnlXZ1dIS2h5U2FlR0RfUUJJ' +
			'QnNVTFdDbFJLTjVxVG5FNG9KMERyZTA4aGZKMzB1NXVKSFR3R3ZCUDBYQjJlSTF5WnB6S1ppbGJiaUc' +
			'4c3ZteWZhYlBFbXYtM2ExRDlLXzhzekdzaHB0UlN4Q041RHdiQlRiYklncWJuY3kwNG03V1dxTSIsIn' +
			'EiOiIyazd3aV8xVElFaG1SbGZEdlJhaE1Hd0NHYlFGVDhsV0t0blhUQ0kzamZtTmpIM0FYVWVyNXIzZ' +
			'XVXVVB4QkFodUE4S0FkQzFBYXpaVmFmX2RhamVKXzg0WFFUZXU5XzhjbVdJekJPTWYxUVBXc2JRWnJt' +
			'c0JMbFBPVUJmLXdqLTFDQzN0TjhsZVBNOTBROUxpZ1RneUtZTnRlVmkwVThwbHFMSHA2cmRkT00iLCJ' +
			'xaSI6IlpubUNCeGh2UVpleWZScVJDdEpzQXczdW1heUJ5WERkSURsRjU3UU1XY3M5anR0ZUZhdWxYZT' +
			'VFSWliMTdLNXJiS3VoZFFEbVJfdGNCTWw4OGtfNzl6djB6RmhhdWFxUUhjMTVvNHRQaC1HS1pZMU90c' +
			'lg2NnEzbi1OSmZjd05rM29QNGpkelVaY1NpZFFySThxTHdDekRQcGtEeW1iZ09BYmRWVkFjdFFOQSJ9' +
			'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACK8voAPPS4DpfyZ0qo2FfNF0B' +
			'Fd5T3PfQqndeK06xN+8987ZcUdML7faFt8740he+LoCSm8wqSdMhxHlHRYjyIgTGd83DrtDeDPWnUwr' +
			'3Q0AXnxTVElXhRZO5TVHwDzXSFetwzMGEtoT6EjNKtabFNKPW2tDP761udUJJIIfPlOHtLBrR6tza2+' +
			'xqfik6OTgezp0gGrnR0/4Ud6Eo/OSXY2dEITeIhwCb4bo1B3HjWyyWP3OdGEkZZxv9doXOcsXmrJVAr' +
			'2MmD3F53iyq92yDZnhZH6/fy4q8ZK/QGIjd3OP7OA+OTFNV6SmP7vQK+M4pfno5CKJEz1YcBmR+kaEi' +
			'NI9Vl/9TMTiMEwWn0Pr0ompgz4pPXNZx2TIewq+e9yGNFnj0ouakLmOoW4MsqtKpvPhXmpa8hWQKmEH' +
			'9pHU/Eccwkp0LUJoorC5KnYv4JQ4j8YucbNY0gUVKgb/qGmkAGDBNrR3cwahtless/aJTi880CwLMoX' +
			'mqFvQuORuLOcLN3lOAoqQNzP61X5YDl8lyA/FObfrvpBNzXMt2+hkl/dm7poKraGlGEQgjeP0zgARKT' +
			'E5/+XZboKMiVQ8avfOnfqEGhhBUH3ZKQcm2qvZUGUGlCKsE19uqJKZi6b2rt7PhDXaO+mcUpCiBvB4z' +
			'9z9Eki50t7u2jL5uCVvJSO1Bubd/DPuW0uVzVLpiXVolkH+gMuHQwbmsm7u66EvC4E7236Ai1hFJDU9' +
			'y5gl2MP//pxuqQdFu/NHo1fUxNMSCEWfl80PKBTU3HiVrGxjoJYuSAWYfuNCy9Nk2QvRKP0xQkjbXpB' +
			'vCNjcmZ3z/mnmbzr0lviPeaJxY55EXfysZ7UqG0UxgTy3yUv1GiwBDJ8ofTaDyB4uslMOUFae5GGGPr' +
			'JYE+uoPNBgVY+c9S8QaYLJliCjZ4am39d6qNuAt0vvK3/BgG3UnRE/Tm2q6ZgCF45fTZewli/mVXxb2' +
			'K0ZCs2BzBiGCpyM4/yx7N6Z9e8h1vgIjdkhKY1Lkp3eO9fpjqsI5s737EuB6DdHob9nG4XNW/qx2jt7' +
			'YbsHph80tcNQEvahzj3RTGft8J7Kgw9ejvsj8uchdOtMXHSCZK8nzKidyPZSX6Xdhwi32h0iGHvihDC' +
			'YFIYnlmoaM2A4lV/GN1FQ/ME2gv665Eqt7TYeJPUId6pLvkEHc0Y/2Dnl97beew0kBLdPxj928Fw7dc' +
			'JWiKIHjVvd1Vl3VaS5bedH6JvZn9MjHEuCLl096jYjET45G06E3zg2ph57vb7v7Hf+HOjd7KCTCQu3v' +
			'pyASVqgIAXM1zGk4FG9grF0wfdsH+bMji2TcUKo4dO975E+r0MCfamLumndHGqwuXrAH4IjWP+2sqJU' +
			'Dm8Hf+8GxhmFdUBQiWLOjQo1E7Lfwx/CsiPD4sO2oz8wYPcp9SOLjUKGa9u4nC/kf9hbqFujTxKdLYo' +
			'mI3pA=='
	),
	publicKey: sodiumUtil.from_base64(
		'eyJhbGciOiJSUzI1NiIsImUiOiJBUUFCIiwiZXh0Ijp0cnVlLCJrZXlfb3BzIjpbInZlcmlmeSJdLCJ' +
			'rdHkiOiJSU0EiLCJuIjoidkVUOG1HY24zcWFyN1FfaXo1MVZjUmNKdHRFSG5VcWNmN1VybTVueko4bG' +
			'80Q2RjQTZLN2dRMDl6bmx4a3NQLTg1RE1NSGdwU29mcU1BY2l6UTVmNW5McGxydEtJX0dtdFJ1T1k2d' +
			'3RHZnZLcjNNX3pWMGxVYVFKSXEyVmg0aTU0ZHo1akp6QTZwWmp4eU91V01VdnJmSXZrWVg5LUl2MTBx' +
			'MTEwYm9waGNmRGpNVTFQbTNZeUlVQzhjSEk2TmN0ZGVOV3dzTEg2WkgwbVdQYTgxZUw2bWtyVzBUZkt' +
			'1Q1ZEaDBFckVCWkJJUUx5TmV1dF9jb2JxR0NoS0V6Y0xVMll6MUUwR19DbkRLVHVYVG5nNEVUQ0FYak' +
			'hDUXJwaUp1aV81UG9SUGdhT0xvcEdKV0RmQXkxMF8yX3ZIeGxab3hrNWFxREx2Z3B3Ny1fdHVTNWRzN' +
			'mlRIn0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAz3ztlxR0wvt9oW3zvjSF74ugJKbzCpJ0' +
			'yHEeUdFiPIiBMZ3zcOu0N4M9adTCvdDQBefFNUSVeFFk7lNUfAPNdIV63DMwYS2hPoSM0q1psU0o9ba' +
			'0M/vrW51Qkkgh8+U4e0sGtHq3Nrb7Gp+KTo5OB7OnSAaudHT/hR3oSj85JdjZ0QhN4iHAJvhujUHceN' +
			'bLJY/c50YSRlnG/12hc5yxeaslUCvYyYPcXneLKr3bINmeFkfr9/Lirxkr9AYiN3c4/s4D45MU1XpKY' +
			'/u9Ar4zil+ejkIokTPVhwGZH6RoSI0j1WX/1MxOIwTBafQ+vSiamDPik9c1nHZMh7Cr573IY0WePSi5' +
			'qQuY6hbgyyq0qm8+FealryFZAqYQf2kdT8RxzCSnQtQmiisLkqdi/glDiPxi5xs1jSBRUqBv+oaaQAY' +
			'ME2tHdzBqG2V6yz9olOLzzQLAsyheaoW9C45G4s5ws3eU4CipA3M/rVflgOXyXID8U5t+u+kE3Ncy3b' +
			'6GSX92bumgqtoaUYRCCN4/TOABEpMTn/5dlugoyJVDxq986d+oQaGEFQfdkpBybaq9lQZQaUIqwTX26' +
			'okpmLpvau3s+ENdo76ZxSkKIG8HjP3P0SSLnS3u7aMvm4JW8lI7UG5t38M+5bS5XNUumJdWiWQf6Ay4' +
			'dDBuaybu7roS8LgTvbfoCLWEUkNT3LmCXYw//+nG6pB0W780ejV9TE0xIIRZ+XzQ8oFNTceJWsbGOgl' +
			'i5IBZh+40LL02TZC9Eo/TFCSNtekG8I2NyZnfP+aeZvOvSW+I95onFjnkRd/KxntSobRTGBPLfJS/Ua' +
			'LAEMnyh9NoPIHi6yUw5QVp7kYYY+slgT66g80GBVj5z1LxBpgsmWIKNnhqbf13qo24C3S+8rf8GAbdS' +
			'dET9ObarpmAIXjl9Nl7CWL+ZVfFvYrRkKzYHMGIYKnIzj/LHs3pn17yHW+AiN2SEpjUuSnd471+mOqw' +
			'jmzvfsS4HoN0ehv2cbhc1b+rHaO3thuwemHzS1w1AS9qHOPdFMZ+3wnsqDD16O+yPy5yF060xcdIJkr' +
			'yfMqJ3I9lJfpd2HCLfaHSIYe+KEMJgUhieWahozYDiVX8Y3UVD8wTaC/rrkSq3tNh4k9Qh3qku+QQdz' +
			'Rj/YOeX3tt57DSQEt0/GP3bwXDt1wlaIogeNW93VWXdVpLlt50fom9mf0yMcS4IuXT3qNiMRPjkbToT' +
			'fODamHnu9vu/sd/4c6N3soJMJC7e+nIBJWqAgBczXMaTgUb2CsXTB92wf5syOLZNxQqjh073vkT6vQw' +
			'J9qYu6ad0carC5esAfgiNY/7ayolQObwd/7wbGGYV1QFCJYs6NCjUTst/DH8KyI8Piw7aknquqxj7+b' +
			'lqIEewEPKEx1mBKgvDLzGgIoEx3azc/nk'
	)
};

export const getPublicKeys = demoSign => {
	const publicKeysJS = fs
		.readFileSync(
			`${__dirname}/../${
				demoSign ?
					'shared/assets/demoagsekeys.json' :
					'websign/js/keys.js'
			}`
		)
		.toString();

	return JSON.parse(
		publicKeysJS
			.substring(publicKeysJS.indexOf('=') + 1)
			.split(';')[0]
			.trim()
			.replace(/\/\*.*?\*\//g, '')
	);
};

export const sign = async (inputs, testSign, demoSign, skipNotify = false) =>
	new Promise(async (resolve, reject) => {
		if (testSign) {
			return resolve({
				rsaIndex: 0,
				signedInputs: await Promise.all(
					inputs.map(async ({additionalData, message}) =>
						Buffer.from(
							await superSphincs.sign(
								message,
								testKeyPair.privateKey,
								additionalData
							)
						)
					)
				),
				sphincsIndex: 0
			});
		}

		if (!skipNotify) {
			childProcess.spawnSync(
				'bash',
				['-c', 'notify "Starting signing process"'],
				{stdio: 'inherit'}
			);
		}

		const publicKeys = getPublicKeys(demoSign);

		const binaryInputs = inputs.map(({additionalData, message}) => ({
			additionalData,
			message:
				message instanceof Uint8Array ? message : Buffer.from(message)
		}));

		const dataToSign = Buffer.from(
			JSON.stringify(
				await Promise.all(
					inputs.map(async o => ({
						additionalData:
							o.additionalData instanceof Uint8Array ?
								{
									data: sodiumUtil.to_base64(
										o.additionalData
									),
									isUint8Array: true
								} :
							o.additionalData === undefined ?
								{none: true} :
								o.additionalData,
						message:
							o.message instanceof Uint8Array ?
								{
									data: sodiumUtil.to_base64(
										await superSphincs.hash(o.message, true)
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

		let closed, incoming;
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

				const rsaIndex = publicKeys.rsa.indexOf(signatureData.rsa);
				const sphincsIndex = publicKeys.sphincs.indexOf(
					signatureData.sphincs
				);

				const signedInputs = binaryInputs.map(
					({additionalData, message}, i) => ({
						additionalData,
						signed: Buffer.concat([
							Buffer.from(signatureData.signatures[i], 'base64'),
							message
						])
					})
				);

				try {
					const keyPair = await superSphincs.importKeys({
						public: {
							rsa: publicKeys.rsa[rsaIndex],
							sphincs: publicKeys.sphincs[sphincsIndex]
						}
					});

					const openedInputs = await Promise.all(
						signedInputs.map(async ({additionalData, signed}) =>
							oldSuperSphincs.open(
								signed,
								keyPair.publicKey,
								additionalData
							)
						)
					);

					if (
						binaryInputs.filter(
							({message}, i) =>
								openedInputs[i].length !== message.length ||
								!sodiumUtil.memcmp(openedInputs[i], message)
						).length > 0
					) {
						throw new Error('Incorrect signed data.');
					}

					console.log('Signing complete.');
					resolve({
						rsaIndex,
						signedInputs: signedInputs.map(o => o.signed),
						sphincsIndex
					});
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
				dataToSign.slice(i, Math.min(i + chunkSize, dataToSign.length))
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

		const signed = await sign(JSON.parse(inputs), testSign, demoSign);

		console.log({
			...signed,
			signedInputs: signed.signedInputs.map(o => o.toString('base64'))
		});
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
