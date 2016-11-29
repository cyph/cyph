import {IMessageData} from '../session/imessagedata';


/**
 * Represents an active file transfer.
 */
export interface ITransfer extends IMessageData {
	/** If defined, indicates an acceptance or rejection of a file transfer. */
	answer: boolean;

	/** Unique ID to represent this file transfer. */
	readonly id: string;

	/** Indicates whether file should be handled as an image. */
	readonly image: boolean;

	/** If image is true, this will be used as a self-destruct timeout for the message. */
	imageSelfDestructTimeout: number;

	/** Indicates whether file is being sent from this Cyph instance. */
	isOutgoing: boolean;

	/** Symmetric key used for encrypting file over the wire. */
	key: Uint8Array;

	/** File name. */
	readonly name: string;

	/** Percentage completion of transfer. */
	percentComplete: number;

	/** File size in bytes (e.g. 3293860). */
	size: number;

	/** MIME type. */
	readonly type: string;

	/** File URL. */
	url: string;
}
