module Cyph {
	export module P2P {
		/**
		 * Represents an active file transfer over a P2P session.
		 * @interface
		 */
		export interface IFileTransfer {
			/** Accumulated binary data of file. */
			data: ArrayBuffer[];

			/** File name. */
			name: string;

			/** Human-readable file size (e.g. 3.14 MB). */
			readableSize: string;

			/** Percentage completion of transfer. */
			percentComplete: number;

			/** File size in bytes (e.g. 3293860). */
			size: number;
		}
	}
}
