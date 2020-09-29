import {IAccountFileRecord} from '../../../proto/types';

/** Filesystem data for DevExtreme. */
export interface IDataSourceFile {
	data: any;
	owner: string;
	record: IAccountFileRecord;
}
