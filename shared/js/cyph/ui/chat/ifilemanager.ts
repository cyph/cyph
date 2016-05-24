import * as Files from 'files/files';


/**
 * Manages files within a chat.
 * @interface
 */
export interface IFileManager {
	/** Files instance. */
	files: Files.IFiles;

	/**
	 * Sends file selected by elem.
	 * @param elem
	 * @param processImage If true, file is assumed to be an image,
	 * and compressed and sent as base64 text.
	 */
	send (elem: HTMLInputElement, processImage?: boolean) : void;
}
