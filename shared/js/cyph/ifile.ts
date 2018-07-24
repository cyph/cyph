/** File data + metadata. */
export interface IFile {
	/** File data. */
	data: Uint8Array;

	/** File MIME type. */
	mediaType: string;

	/** File name. */
	name: string;

	/** If applicable, originating URI. */
	uri?: string;
}
