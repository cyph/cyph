import type {IAccountFileRecord} from '../../../proto/types';

/** Filesystem data for DevExtreme. */
export interface IDataSourceFile {
	/** Data. */
	data: any;

	/** @see IAccountFileReference.owner */
	owner: string;

	/** @see IAccountFileRecord */
	record: IAccountFileRecord;
}
