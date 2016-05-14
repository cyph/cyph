/**
 * Represents an active file transfer over a P2P session.
 * @interface
 */
export interface IFileTransfer {
	/** Accumulated binary data of file. */
	data: ArrayBuffer[];

	/** Symmetric key used for encrypting file over the wire. */
	key: Uint8Array;

	/** File name. */
	name: string;

	/** Human-readable file size (e.g. 3.14 MB). */
	readableSize: string;

	/** Number of file chunks being asynchronously processed. */
	pendingChunks: number;

	/** Percentage completion of transfer. */
	percentComplete: number;

	/** File size in bytes (e.g. 3293860). */
	size: number;
}
