import {IAccountFileRecord} from '../../../proto/types';

/** Filesystem data for DevExtreme. */
export interface IDataSourceFile {
	data: any;
	id: string;
	isDirectory: boolean;
	owner: string;
	record: IAccountFileRecord;
}
