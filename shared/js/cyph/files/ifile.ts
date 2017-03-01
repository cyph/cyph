/**
 * Represents one file.
 */
export interface IFile {
	/** File type. */
	filetype: string;

	/** Where to find the file. */
	location: string;

	/** File name. */
	name: string;

	/** Size in bytes. */
	size: number;
}
