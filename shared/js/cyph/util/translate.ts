import {env} from '../env';


/**
 * Attempts to translate text into the user's language.
 * @param defaultValue Falls back to this if no translation exists.
 */
export const translate	= (text: string, defaultValue: string = text) : string => {
	if (!translations || !translations[env.language] || !translations[env.language][text]) {
		return defaultValue;
	}

	return translations[env.language][text];
};
