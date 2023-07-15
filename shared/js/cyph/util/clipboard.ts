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
		await clipboard.writeText(text);

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
