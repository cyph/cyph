import {config} from '../config';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {random} from './random';

/** Random ID meant optimized for readability by humans. Uses Config.readableIDCharacters. */
export const readableID = (length: number = 20): string => {
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
export const uuid = (long: boolean = false): string => {
	const bytes = !long ?
		potassiumUtil.randomBytes(16) :
		potassiumUtil.concatMemory(
			true,
			/* tslint:disable-next-line:ban */
			new Uint32Array([Date.now()]),
			potassiumUtil.randomBytes(64)
		);

	const hex = potassiumUtil.toHex(bytes);
	potassiumUtil.clearMemory(bytes);
	return hex;
};
