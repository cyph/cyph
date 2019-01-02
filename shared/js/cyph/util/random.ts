import {config} from '../config';
import {potassiumUtil} from '../crypto/potassium/potassium-util';


/**
 * Cryptographically secure replacement for Math.random.
 * @param max Upper bound.
 * @param min Lower bound (0 by default).
 * @returns If max is specified, returns integer in range [min, max);
 * otherwise, returns float in range [0, 1) (like Math.random).
 */
export const random	= (max?: number, min: number = 0) : number => {
	const randomData	= potassiumUtil.randomBytes(6);

	let randomUint	= 0;
	for (let i = 0 ; i < randomData.length ; ++i) {
		randomUint += randomData[i] * Math.pow(2, i * 8);
		randomData[i]	= 0;
	}

	if (max === config.maxSafeUint) {
		return randomUint;
	}

	const randomFloat	= randomUint / config.maxSafeUint;

	if (max === undefined) {
		return randomFloat;
	}
	if (isNaN(max) || max <= 0) {
		throw new Error('Upper bound must be a positive non-zero number.');
	}
	if (isNaN(min) || min < 0) {
		throw new Error('Lower bound must be a positive number or zero.');
	}
	if (min >= max) {
		throw new Error('Upper bound must be greater than lower bound.');
	}

	return Math.floor((randomFloat * (max - min)) + min);
};
