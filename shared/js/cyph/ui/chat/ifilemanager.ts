import {IFiles} from '../../files/ifiles';


/**
 * Manages files within a chat.
 * @interface
 */
export interface IFileManager {
	/** Files instance. */
	files: IFiles;

	/**
	 * Sends file.
	 * @param file
	 * @param processImage If true, file is assumed to be an image,
	 * and compressed and sent as base64 text.
	 */
	send (file: File, processImage?: boolean) : void;
}
