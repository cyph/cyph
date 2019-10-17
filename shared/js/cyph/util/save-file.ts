import fileSaver from 'file-saver';
import {env} from '../env';
import {staticDialogService} from './static-services';
import {translate} from './translate';
import {retryUntilSuccessful, sleep} from './wait';

/** Saves to a local file. */
export const saveFile = async (
	content: Uint8Array,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	const oldBeforeUnloadMessage = beforeUnloadMessage;
	beforeUnloadMessage = undefined;

	const fileMediaType =
		mediaType && mediaType.indexOf('/') > 0 ?
			mediaType :
			'application/octet-stream';

	const fileBlob = new Blob([content], {type: fileMediaType});

	const save = () => {
		fileSaver.saveAs(fileBlob, fileName, {autoBom: false});
	};

	if (env.isCordovaMobile) {
		const fs = await new Promise<any>((resolve, reject) => {
			(<any> self).requestFileSystem(
				(<any> self).LocalFileSystem.PERSISTENT,
				0,
				resolve,
				reject
			);
		});

		/* If balls.png already exists, try balls.0.png, balls.1.png, etc. */
		let fileNameIncrement = -2;
		const fileEntry = await retryUntilSuccessful(
			async () =>
				new Promise<any>((resolve, reject) => {
					fs.root.getFile(
						++fileNameIncrement < 0 ?
							fileName :
						fileName.indexOf('.') < 0 ?
							`${fileName}.${fileNameIncrement.toString()}` :
							(() => {
								const fileNameSplit = fileName.split('.');
								fileNameSplit.splice(
									-1,
									0,
									fileNameIncrement.toString()
								);
								return fileNameSplit.join('.');
							})(),
						{create: true, exclusive: true},
						resolve,
						reject
					);
				})
		);

		const fileWriter = await new Promise<any>((resolve, reject) => {
			fileEntry.createWriter(resolve, reject);
		});

		const fileWriteResult = new Promise<any>((resolve, reject) => {
			fileWriter.onwriteend = resolve;
			fileWriter.onerror = reject;
		});

		let fileBlobURL: string | undefined;
		try {
			fileBlobURL = URL.createObjectURL(fileBlob);
			fileWriter.write(fileBlobURL);
			await fileWriteResult;
		}
		finally {
			if (fileBlobURL) {
				URL.revokeObjectURL(fileBlobURL);
			}
		}
	}
	else if (env.safariVersion === undefined || env.safariVersion >= 10.1) {
		save();
	}
	else {
		const handler = () => {
			document.removeEventListener('click', handler);
			save();
		};
		document.addEventListener('click', handler);
		await (await staticDialogService).alert({
			content: `${translate('Saving file')} "${fileName}" ${translate(
				'with the name "unknown", due to a Safari bug'
			)}.`,
			title: translate('Save File')
		});
	}

	await sleep();
	beforeUnloadMessage = oldBeforeUnloadMessage;
};
