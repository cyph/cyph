import {Injectable} from '@angular/core';
import html2canvas from 'html2canvas';
import {BaseProvider} from '../base-provider';
import {saveFile} from '../util/save-file';
import {getISODateString, getTimeString} from '../util/time';
import {sleep} from '../util/wait';
import {FileService} from './file.service';

/**
 * Angular service for taking screenshots.
 */
@Injectable()
export class ScreenshotService extends BaseProvider {
	/** Gets screenshot. */
	public async getScreenshot () : Promise<Uint8Array> {
		return this.fileService.canvasToBytes(await html2canvas(document.body));
	}

	/** Gets screenshot. */
	public async saveScreenshot (delay: number = 0) : Promise<void> {
		if (delay > 0) {
			await sleep(delay);
		}

		await saveFile(
			await this.getScreenshot(),
			`Screenshot ${getISODateString()} at ${getTimeString(
				undefined,
				true
			).replace(/:/g, '.')}.png`,
			'image/png'
		);
	}

	constructor (
		/** @ignore */
		private readonly fileService: FileService
	) {
		super();
	}
}
