import {ITransfer} from './itransfer';


/**
 * Manages file transfers.
 */
export interface IFiles {
	/** In-progress file transfers. */
	readonly transfers: ITransfer[];

	/**
	 * Sends data as a file with the specified name.
	 * @param plaintext
	 * @param name
	 */
	send (plaintext: Uint8Array, name: string) : void;
}
