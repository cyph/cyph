import IMask from 'imask';

/** Username text mask. */
export const usernameMask: IMask.MaskedPatternOptions = {
	definitions: {
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'#': /[0-9A-Za-z_]/
	},
	mask: new Array(50).fill('#').join('')
};
