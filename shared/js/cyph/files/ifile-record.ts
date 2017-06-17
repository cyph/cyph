/**
 * Represents one file.
 */
export interface IFileRecord {
	/** File ID. */
	id: string;

	/** File MIME type. */
	mediaType: string;

	/** File name. */
	name: string;

	/** Type of file record. */
	recordType: 'file'|'note';

	/** Size in bytes. */
	size: number;

	/** Timestamp of upload or last save. */
	timestamp: number;
}
