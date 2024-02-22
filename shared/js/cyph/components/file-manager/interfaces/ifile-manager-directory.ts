import type {IDataSourceFile} from './idata-source-file';

/** Directory data from DevExtreme. */
export interface IFileManagerDirectory {
	/** Directory name. */
	id: string;

	/** Always true. */
	isDirectory: boolean;

	/** Items in directory. */
	items: (IDataSourceFile | IFileManagerDirectory)[];

	/** Directory name. */
	name: string;
}
