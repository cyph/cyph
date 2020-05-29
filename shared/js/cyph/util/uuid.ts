import {config} from '../config';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {random} from './random';

/** Random ID meant optimized for readability by humans. Uses Config.readableIDCharacters. */
export const readableID = (length: number = 20) : string => {
	let id = '';
	for (let i = 0; i < length; ++i) {
		id +=
			config.readableIDCharacters[
				random(config.readableIDCharacters.length)
			];
	}
	return id;
};

/** Creates a hex string containing 16 random bytes (or optionally 64 + timestamp). */
export const uuid = (
	long: boolean = false,
	includeTimestamp: boolean = long
) : string => {
	const randomBytes = potassiumUtil.randomBytes(long ? 64 : 16);

	const bytes = !includeTimestamp ?
		randomBytes :
		potassiumUtil.concatMemory(
			true,
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			new Uint32Array([Date.now()]),
			randomBytes
		);

	const hex = potassiumUtil.toHex(bytes);
	potassiumUtil.clearMemory(randomBytes);
	return hex;
};
