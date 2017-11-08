import {saveAs} from 'file-saver';
import {env} from '../env';
import {DialogService} from '../services/dialog.service';
import {translate} from './translate';
import {sleep} from './wait';


/** Sets dialogService. */
export let resolveDialogService: (dialogService: DialogService) => void;

/** @ignore */
const staticDialogService: Promise<DialogService|undefined>	=
	new Promise<DialogService|undefined>(resolve => {
		if (!env.isMainThread) {
			resolve();
		}

		resolveDialogService	= resolve;
	})
;

/** Opens the specified URL. */
export const saveFile	= async (
	content: Uint8Array,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	const dialogService	= await staticDialogService;
	if (!dialogService) {
		throw new Error('Dialog service not found.');
	}

	const oldBeforeUnloadMessage	= beforeUnloadMessage;
	beforeUnloadMessage				= undefined;

	const save	= () => {
		saveAs(
			new Blob(
				[content],
				{
					type: mediaType && mediaType.indexOf('/') > 0 ?
						mediaType :
						'application/octet-stream'
				}
			),
			fileName,
			false
		);
	};

	if (!env.isSafari) {
		save();
	}
	else {
		const handler	= () => {
			document.removeEventListener('click', handler);
			save();
		};
		document.addEventListener('click', handler);
		await dialogService.alert({
			content: `${
				translate('Saving file')
			} "${fileName}" ${
				translate('with the name "unknown", due to a Safari bug')
			}.`,
			title: translate('Save File')
		});
	}

	await sleep();
	beforeUnloadMessage	= oldBeforeUnloadMessage;
};
