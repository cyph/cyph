/**
 * Represents an active file transfer.
 * @interface
 */
export interface ITransfer {
	/** Symmetric key used for encrypting file over the wire. */
	key: Uint8Array;

	/** Indicates whether file is being sent from this Cyph instance. */
	isOutgoing: boolean;

	/** File name. */
	name: string;

	/** File URL. */
	url: string;

	/** Percentage completion of transfer. */
	percentComplete: number;

	/** File size in bytes (e.g. 3293860). */
	size: number;
}
