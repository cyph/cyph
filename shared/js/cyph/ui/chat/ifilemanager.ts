import {IFiles} from '../../files/ifiles';


/**
 * Manages files within a chat.
 */
export interface IFileManager {
	/** Files instance. */
	readonly files: IFiles;

	/**
	 * Sends file.
	 * @param file
	 * @param image If true, file is processed as an image
	 * (compressed and displayed in the message list).
	 * @param imageSelfDestructTimeout
	 */
	send (file: File, image?: boolean, imageSelfDestructTimeout?: number) : Promise<void>;
}
