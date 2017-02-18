/**
 * Represents one file.
 */
export interface IFile {
	/** File name. */
	name: string;

	/** File type. */
	filetype: string;

	/** Where to find the file. */
	location: string;

	/** Size in bytes. */
	size: number;
}
