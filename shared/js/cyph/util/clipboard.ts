import * as clipboard from 'clipboard-polyfill';

/** Copies text to clipboard. */
export const copyToClipboard = async (text: string) : Promise<void> => {
	try {
		await clipboard.writeText(text);
	}
	catch (err) {
		if (
			!(<any> self).cordova ||
			!(<any> self).cordova.plugins ||
			!(<any> self).cordova.plugins.clipboard
		) {
			throw err;
		}

		await new Promise((resolve, reject) => {
			(<any> self).cordova.plugins.clipboard.copy(text, resolve, reject);
		});
	}
};
