/** File data from DevExtreme. */
export interface IFileManagerFile {
	/** Always false. */
	isDirectory: boolean;

	/** Key. */
	key: string;

	/** File name. */
	name: string;

	/** File size. */
	size: number | string;
}
