import {MaskedPatternOptions} from 'imask';

/** Username text mask. */
export const usernameMask: MaskedPatternOptions = {
	definitions: {
		/* eslint-disable-next-line @typescript-eslint/naming-convention */
		'#': /[0-9A-Za-z_]/
	},
	mask: new Array(50).fill('#').join('')
};

/** Username validation regex. */
export const usernameRegex = /^[0-9A-Za-z_]{1,50}$/;
