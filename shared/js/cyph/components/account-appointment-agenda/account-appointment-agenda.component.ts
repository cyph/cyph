import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	ViewChild
} from '@angular/core';
import {Router} from '@angular/router';
import {
	ActionEventArgs,
	AgendaService,
	DayService,
	DragAndDropService,
	MonthService,
	ResizeService,
	ScheduleComponent,
	WeekService,
	WorkWeekService
} from '@syncfusion/ej2-angular-schedule';
import {ItemModel, MenuEventArgs} from '@syncfusion/ej2-angular-splitbuttons';
import {Internationalization} from '@syncfusion/ej2-base';
import memoize from 'lodash-es/memoize';
import unescape from 'lodash-es/unescape';
import {BaseProvider} from '../../base-provider';
import {ISchedulerObject} from '../../calendar';
import {IAppointment} from '../../proto/types';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {parseRecurrenceRule} from '../../util/calendar';
import {decodeHTML} from '../../util/serialization/html-encoding';
import {getDateTimeString} from '../../util/time';
import {uuid} from '../../util/uuid';
import {openWindow} from '../../util/window';

/**
 * Angular component for account appointment agenda/scheduler.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		AgendaService,
		DayService,
		DragAndDropService,
		MonthService,
		ResizeService,
		WeekService,
		WorkWeekService
	],
	selector: 'cyph-account-appointment-agenda',
	styleUrls: ['./account-appointment-agenda.component.scss'],
	templateUrl: './account-appointment-agenda.component.html'
})
export class AccountAppointmentAgendaComponent
	extends BaseProvider
	implements OnInit
{
	/** @ignore */
	private readonly internationalization = new Internationalization();

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** Formats date as string. */
	public readonly getTimeString = memoize((date: Date) : string =>
		this.internationalization.formatDate(date, {skeleton: 'hm'})
	);

	/** Split button menu options for hosting an unscheduled call. */
	public readonly hostMenuItems: ItemModel[] = [
		{
			iconCss: 'fa fa-video',
			text: this.stringsService.videoCallTitle
		},
		{
			iconCss: 'fa fa-phone',
			text: this.stringsService.audioCallTitle
		}
	];

	/** @see openWindow */
	public readonly openWindow = openWindow;

	/** @see ScheduleComponent */
	@ViewChild('schedule', {read: ScheduleComponent})
	public schedule?: ScheduleComponent;

	/** @see ScheduleComponent.selectedDate */
	public selectedDate: Date = new Date();

	/** Delete appointment. */
	private async appointmentDelete (data: ISchedulerObject) : Promise<void> {
		const reset = (message: string) => {
			this.schedule?.addEvent(data);

			this.dialogService.toast(
				message,
				undefined,
				this.stringsService.ok
			);
		};

		if (!data.Appointment.calendarInvite.uid) {
			reset(this.stringsService.appointmentEditIncompatible);
			return;
		}

		try {
			await this.accountAppointmentsService.cancelInvite(
				data.Appointment
			);
			await this.accountFilesService.remove(data.Record, false);
		}
		catch (err) {
			reset(this.stringsService.appointmentEditFailure);
			throw err;
		}
	}

	/** Edit appointment. */
	private async appointmentEdit (data: ISchedulerObject) : Promise<void> {
		/* Workaround for Syncfusion bug */
		for (const [k, v] of Array.from(Object.entries(data))) {
			if (typeof v === 'string') {
				(<any> data)[k] = decodeHTML(v);
			}
		}

		const oldAppointment = data.Appointment;

		const reset = (message: string) => {
			data.Appointment = oldAppointment;
			data.Description = data.OldData.Description;
			data.EndTime = data.OldData.EndTime;
			data.Id = data.OldData.Id;
			data.Location = data.OldData.Location;
			data.RecurrenceException = data.OldData.RecurrenceException;
			data.RecurrenceRule = data.OldData.RecurrenceRule;
			data.StartTime = data.OldData.StartTime;
			data.Subject = data.OldData.Subject;

			this.schedule?.saveEvent(<any> data);

			this.dialogService.toast(
				message,
				undefined,
				this.stringsService.ok
			);
		};

		if (!data.Appointment.calendarInvite.uid) {
			if (
				data.Description === data.OldData.Description &&
				data.EndTime === data.OldData.EndTime &&
				data.Id === data.OldData.Id &&
				data.Location === data.OldData.Location &&
				data.RecurrenceException === data.OldData.RecurrenceException &&
				data.RecurrenceRule === data.OldData.RecurrenceRule &&
				data.StartTime === data.OldData.StartTime &&
				data.Subject === data.OldData.Subject
			) {
				return;
			}

			reset(this.stringsService.appointmentEditIncompatible);
			return;
		}

		try {
			const appointment: IAppointment = {
				...data.Appointment,
				calendarInvite: {
					...data.Appointment.calendarInvite,
					endTime: data.EndTime.getTime(),
					recurrence: parseRecurrenceRule(
						data.RecurrenceRule,
						data.RecurrenceException
					),
					startTime: data.StartTime.getTime(),
					title: data.Appointment.fromName ?
						data.Description :
						data.Subject
				}
			};

			await this.accountAppointmentsService.sendInvite(appointment);
			await this.accountFilesService.updateAppointment(
				data.Record.id,
				appointment
			);

			data.Appointment = appointment;

			data.OldData = {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Description: data.Description,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EndTime: data.EndTime,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Id: data.Id,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Location: data.Location,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				RecurrenceException: data.RecurrenceException,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				RecurrenceRule: data.RecurrenceRule,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				StartTime: data.StartTime,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Subject: data.Subject
			};
		}
		catch (err) {
			reset(this.stringsService.appointmentEditFailure);
			throw err;
		}
	}

	/** Add single event forked off of recurring appointment. */
	private async appointmentFork (data: ISchedulerObject) : Promise<void> {
		try {
			const appointment: IAppointment = {
				...data.Appointment,
				calendarInvite: {
					...data.Appointment.calendarInvite,
					burnerUID: data.Appointment.calendarInvite.uid,
					endTime: data.EndTime.getTime(),
					recurrence: undefined,
					startTime: data.StartTime.getTime(),
					title: data.Appointment.fromName ?
						data.Description :
						data.Subject,
					uid: uuid()
				}
			};

			await this.accountAppointmentsService.sendInvite(appointment);
			await this.accountFilesService.upload(
				(this.envService.isTelehealth ?
					`${this.stringsService.telehealthCallAbout} ` :
					'') + (appointment.calendarInvite.title || '?'),
				appointment
			).result;

			data.Appointment = appointment;

			data.OldData = {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Description: data.Description,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EndTime: data.EndTime,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Id: data.Id,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Location: data.Location,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				RecurrenceException: data.RecurrenceException,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				RecurrenceRule: data.RecurrenceRule,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				StartTime: data.StartTime,
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Subject: data.Subject
			};
		}
		catch (err) {
			this.dialogService.toast(
				this.stringsService.appointmentEditFailure,
				undefined,
				this.stringsService.ok
			);
			throw err;
		}
	}

	/** Action complete handler. */
	public async actionComplete (e: ActionEventArgs) : Promise<void> {
		if (
			e.requestType !== 'eventChanged' &&
			e.requestType !== 'eventRemoved'
		) {
			return;
		}

		const transformRecord = (o: any) : any => {
			if (typeof o !== 'object' || !o) {
				return o;
			}

			for (const k of Object.keys(o)) {
				if (typeof o[k] === 'string') {
					o[k] = unescape(o[k]);
				}
			}

			return o;
		};

		try {
			this.accountService.interstitial.next(true);

			await Promise.all(
				(e.addedRecords || [])
					.map(transformRecord)
					.map(async (o: any) => this.appointmentFork(o))
			);

			await Promise.all(
				(e.changedRecords || [])
					.map(transformRecord)
					.map(async (o: any) => this.appointmentEdit(o))
			);

			await Promise.all(
				(e.deletedRecords || [])
					.map(transformRecord)
					.map(async (o: any) => this.appointmentDelete(o))
			);
		}
		finally {
			this.accountService.interstitial.next(false);
		}
	}

	/** Event handler for hosting options split button. */
	public async hostOptions (args: MenuEventArgs) : Promise<void> {
		const callType =
			args.item.text === this.stringsService.videoCallTitle ?
				'video' :
				'audio';

		if (!this.accountDatabaseService.currentUser.value?.agseConfirmed) {
			await openWindow(
				callType ?
					this.envService.cyphVideoUrl :
					this.envService.cyphAudioUrl
			);
		}
		else if (this.envService.isCordovaMobile) {
			await this.router.navigate(['account-burner', callType]);
		}
		else {
			await openWindow(`#account-burner/${callType}`);
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see Router */
		public readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService,

		/** @see WindowWatcherService */
		public readonly windowWatcherService: WindowWatcherService
	) {
		super();
	}
}
