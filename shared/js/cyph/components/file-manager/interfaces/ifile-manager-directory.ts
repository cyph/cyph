import {IDataSourceFile} from './idata-source-file';

/** Directory data from DevExtreme. */
export interface IFileManagerDirectory {
	id: string;
	isDirectory: boolean;
	items: (IDataSourceFile | IFileManagerDirectory)[];
	name: string;
}
