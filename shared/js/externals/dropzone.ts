/* eslint-disable */

/** @file dropzone external. */

export interface DropzoneFile extends File {
	accepted: boolean;
	dataURL?: string;
	previewsContainer: HTMLElement;
	previewElement: HTMLElement;
	previewTemplate: HTMLElement;
	status: string;
	upload?: any;
	xhr?: XMLHttpRequest;
}

export default class {
	public destroy () : void {}

	public removeAllFiles () : void {}

	constructor (
		_CONTAINER: any,
		_OPTIONS: {
			accept: (
				file: DropzoneFile,
				done: (error?: string | Error | undefined) => void
			) => void;
			acceptedFiles?: string;
			filesizeBase: number;
			maxFilesize: number;
			url: string;
		}
	) {}
}
