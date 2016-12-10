import {ChangeDetectorRef} from '@angular/core';
import {ITransfer} from './itransfer';


/**
 * Manages file transfers.
 */
export interface IFiles {
	/** @ignore Temporary workaround. */
	changeDetectorRef: ChangeDetectorRef;

	/** In-progress file transfers. */
	readonly transfers: Set<ITransfer>;

	/**
	 * Sends data as a file with the specified name.
	 * @param plaintext
	 * @param name
	 * @param type
	 * @param image
	 * @param imageSelfDestructTimeout
	 */
	send (
		plaintext: Uint8Array,
		name: string,
		type: string,
		image: boolean,
		imageSelfDestructTimeout: number
	) : void;
}
