import * as clipboard from 'clipboard-polyfill';
import {staticDialogService} from './static-services';

/** Copies text to clipboard. */
export const copyToClipboard = async (
	text: string,
	successToast?: string,
	failureToast?: string,
	toastDuration: number = 750
) : Promise<void> => {
	try {
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

			await new Promise<any>((resolve, reject) => {
				(<any> self).cordova.plugins.clipboard.copy(
					text,
					resolve,
					reject
				);
			});
		}

		if (successToast) {
			await (
				await staticDialogService
			).toast(successToast, toastDuration);
		}
	}
	catch (err) {
		if (failureToast) {
			await (
				await staticDialogService
			).toast(failureToast, toastDuration);
		}
		else {
			throw err;
		}
	}
};
