import {saveAs} from 'file-saver';
import {env} from '../env';
import {staticDialogService} from './static-services';
import {translate} from './translate';
import {sleep} from './wait';


/** Opens the specified URL. */
export const saveFile	= async (
	content: Uint8Array,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	const dialogService	= await staticDialogService;

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
