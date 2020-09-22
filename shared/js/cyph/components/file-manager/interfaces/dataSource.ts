import {IAccountFileRecord} from '../../../proto'

export interface IDataSource {
	data: any;
	owner: string;
	record: IAccountFileRecord;
}
