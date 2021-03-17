import {emailRegex} from './email-regex.js';

export const validateInput = (input, regex, optional) => {
	if (!input && optional) {
		return;
	}

	if (!input || input.indexOf('/') > -1 || (regex && !regex.test(input))) {
		throw new Error('Invalid data.');
	}

	return input;
};

export const validateEmail = (email, optional) =>
	validateInput((email || '').trim().toLowerCase(), emailRegex, optional);
