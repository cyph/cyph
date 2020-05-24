import * as fileSaver from 'file-saver';
import {Subject} from 'rxjs';
import {take} from 'rxjs/operators';
import {env} from '../env';
import {shareFile} from './cordova/share-file';
import {staticDialogService, staticStringsService} from './static-services';
import {translate} from './translate';
import {retryUntilSuccessful, sleep} from './wait';

/** Saves to a local file. */
export const saveFile = async (
	content: Uint8Array | Blob | string,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	const [dialogService, stringsService] = await Promise.all([
		staticDialogService,
		staticStringsService
	]);

	const oldBeforeUnloadMessage = beforeUnloadMessage;
	beforeUnloadMessage = undefined;

	try {
		fileName = (fileName.match(/[\w\-. ]/g) || []).join('');

		const fileMediaType =
			mediaType && mediaType.indexOf('/') > 0 ?
				mediaType :
				'application/octet-stream';

		const fileBlob =
			content instanceof Blob ?
				content :
				new Blob([content], {type: fileMediaType});

		const save = () => {
			fileSaver.saveAs(fileBlob, fileName, {autoBom: false});
		};

		if (env.isCordovaMobile) {
			if (!env.isAndroid) {
				return shareFile(content, fileName, mediaType);
			}

			const fsURL = 'file:///storage/emulated/0/Download';

			const fs = await new Promise<any>((resolve, reject) => {
				(<any> self).resolveLocalFileSystemURL(fsURL, resolve, reject);
			});

			/* If balls.png already exists, try balls.0.png, balls.1.png, etc. */
			let fileNameIncrement = -2;
			let savedFileName = fileName;
			const fileEntry = await retryUntilSuccessful(
				async () =>
					new Promise<any>((resolve, reject) => {
						fs.getFile(
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
									savedFileName = fileNameSplit.join('.');
									return savedFileName;
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

			const fileWriteEvent = new Subject<void>();

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const fileWriteResult = new Promise<any>((resolve, reject) => {
				fileWriter.onwriteend = resolve;
				fileWriter.onerror = reject;
				fileWriter.onwrite = () => {
					fileWriteEvent.next();
				};
			});

			const cordovaWriteBlockSize = 1048576;

			const fileBlobParts = new Array(
				Math.ceil(fileBlob.size / cordovaWriteBlockSize)
			)
				.fill(0)
				.map((_, i) =>
					fileBlob.slice(
						i * cordovaWriteBlockSize,
						Math.min((i + 1) * cordovaWriteBlockSize, fileBlob.size)
					)
				);

			for (const fileBlobPart of fileBlobParts) {
				const filePartWriteComplete = fileWriteEvent
					.pipe(take(1))
					.toPromise();

				if (fileWriter.length > 0) {
					fileWriter.seek(fileWriter.length);
				}

				fileWriter.write(fileBlobPart);

				await filePartWriteComplete;
			}

			await fileWriteResult;

			const maxFileNameLength = 48;

			const shouldOpenFile = await dialogService.toast(
				`${translate('Saved')} ${
					savedFileName.length > maxFileNameLength ?
						`${savedFileName.slice(0, maxFileNameLength - 3)}...` :
						savedFileName
				} ${translate('to downloads folder.')}`,
				3000,
				stringsService.open
			);

			if (!shouldOpenFile) {
				return;
			}

			try {
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				await new Promise<void>((resolve, reject) => {
					(<any> self).cordova.plugins.fileOpener2.showOpenWithDialog(
						fsURL.slice(0, -9) + <string> fileEntry.fullPath,
						fileMediaType,
						{
							error: reject,
							success: resolve
						}
					);
				});
			}
			catch {
				await dialogService.toast(stringsService.openFileFailed, 750);
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
			await dialogService.alert({
				content: `${translate('Saving file')} "${fileName}" ${translate(
					'with the name "unknown", due to a Safari bug'
				)}.`,
				title: translate('Save File')
			});
		}
	}
	catch {
		await dialogService.toast(stringsService.saveFileFailed, 750);
	}
	finally {
		await sleep();
		beforeUnloadMessage = oldBeforeUnloadMessage;
	}
};
