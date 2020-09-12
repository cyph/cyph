import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ViewChild
} from '@angular/core';
import {Options} from 'fullcalendar';
import memoize from 'lodash-es/memoize';
import {CalendarComponent} from 'ng-fullcalendar';
import {take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {
	AccountUserTypes,
	CallTypes,
	IAccountFileRecord,
	IAppointment
} from '../../proto';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {ConfigService} from '../../services/config.service';
import {DatabaseService} from '../../services/database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {getDateTimeString, watchTimestamp} from '../../util/time';

/**
 * Angular component for account appointments UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-appointments',
	styleUrls: ['./account-appointments.component.scss'],
	templateUrl: './account-appointments.component.html'
})
export class AccountAppointmentsComponent extends BaseProvider
	implements AfterViewInit {
	/** @ignore */
	private calendarEvents: {end: number; start: number; title: string}[] = [];

	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** @see CalendarComponent */
	@ViewChild('calendar', {read: CalendarComponent})
	public calendar?: CalendarComponent;

	/** Calendar configuration. */
	public readonly calendarOptions: Options = {
		aspectRatio: 1.5,
		defaultView: 'agendaDay',
		editable: false,
		eventLimit: false,
		eventSources: [
			{
				events: (
					_START: any,
					_END: any,
					_TIMEZONE: any,
					callback: (
						calendarEvents: {
							end: number;
							start: number;
							title: string;
						}[]
					) => void
				) => {
					callback(this.calendarEvents);
				}
			}
		],
		header: {
			center: 'title',
			left: 'prev,next today',
			right: 'month,agendaWeek,agendaDay,listMonth'
		},
		timezone: 'local'
	};

	/** @see CallTypes */
	public readonly callTypes = CallTypes;

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** Gets user. */
	public readonly getUser = memoize(async (username: string) =>
		this.accountUserLookupService.getUser(username)
	);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Current time; used to check if appointment is within range. */
	public readonly timestampWatcher = watchTimestamp();

	/** Accepts appointment request. */
	public async accept ({
		appointment,
		friend,
		record
	}: {
		appointment: IAppointment;
		friend?: string;
		record: IAccountFileRecord;
	}) : Promise<void> {
		await Promise.all([
			this.accountFilesService.acceptIncomingFile(
				record,
				undefined,
				undefined,
				appointment
			),
			!friend && !appointment.fromEmail ?
				undefined :
				this.databaseService.callFunction('appointmentInvite', {
					callType:
						appointment.calendarInvite.callType ===
						CallTypes.Audio ?
							'audio' :
						appointment.calendarInvite.callType ===
							CallTypes.Video ?
							'video' :
							undefined,
					eventDetails: {
						endTime: appointment.calendarInvite.endTime,
						startTime: appointment.calendarInvite.startTime
					},
					telehealth: this.configService.planConfig[
						await this.accountSettingsService.plan
							.pipe(take(1))
							.toPromise()
					].telehealth,
					to: {
						members: [friend || {
								email: appointment.fromEmail,
								name: appointment.fromName
							}]
					}
				})
		]);
	}

	/** Calendar clickButton event handler. */
	public calendarClickButton (_EVENT_DETAIL: any) : void {}

	/** Calendar eventClick event handler. */
	public calendarEventClick (_EVENT_DETAIL: any) : void {}

	/** Calendar eventDrop/eventResize event handler. */
	public calendarUpdateEvent (_EVENT_DETAIL: any) : void {}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		this.accountService.transitionEnd();

		if (this.calendar) {
			await this.calendar.initialized.pipe(take(1)).toPromise();
		}

		this.subscriptions.push(
			this.accountAppointmentsService.allAppointments.subscribe(
				appointments => {
					this.calendarEvents = appointments.map(({appointment}) => ({
						end: appointment.calendarInvite.endTime,
						start: appointment.calendarInvite.startTime,
						title: appointment.calendarInvite.title
					}));

					if (this.calendar) {
						this.calendar.fullCalendar('refetchEvents');
					}
				}
			)
		);
	}

	constructor (
		/** @ignore */
		public readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		public readonly configService: ConfigService,

		/** @ignore */
		public readonly databaseService: DatabaseService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
