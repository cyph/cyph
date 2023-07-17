import {MaskedNumberOptions} from 'imask';

/** Currency text mask. */
export const currencyMask: MaskedNumberOptions = {
	mask: Number,
	normalizeZeros: true,
	scale: 2
};
