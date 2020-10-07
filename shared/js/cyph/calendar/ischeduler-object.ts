import {IAppointment, IAccountFileRecord} from '../proto/types';
import {ISchedulerObjectBase} from './ischeduler-object-base';

/** Data for SyncFusion scheduler component. */
export interface ISchedulerObject extends ISchedulerObjectBase {
	/** @see IAppointment */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Appointment: IAppointment;

	/** Old data. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	OldData: ISchedulerObjectBase;

	/** @see IAccountFileRecord */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Record: IAccountFileRecord;
}
