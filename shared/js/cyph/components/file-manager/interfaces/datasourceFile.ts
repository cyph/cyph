import {IAccountFileRecord} from '../../../proto/types';

export interface IDatasourceFile {
	data: any;
	owner: string;
	record: IAccountFileRecord
}
