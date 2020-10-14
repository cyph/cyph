/** Base data for SyncFusion scheduler component. */
export interface ISchedulerObjectBase {
	/** Description. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Description: string;

	/** End time. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	EndTime: Date;

	/** ID. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Id: number;

	/** Location. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Location: string;

	/** Recurrence rule. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	RecurrenceRule: string;

	/** Start time. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	StartTime: Date;

	/** Subject. */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	Subject: string;
}
