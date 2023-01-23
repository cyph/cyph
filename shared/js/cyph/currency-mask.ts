import IMask from 'imask';

/** Currency text mask. */
export const currencyMask: IMask.MaskedNumberOptions = {
	mask: Number,
	normalizeZeros: true,
	scale: 2
};
