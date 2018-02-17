import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {Options} from 'fullcalendar';
import memoize from 'lodash-es/memoize';
import {CalendarComponent} from 'ng-fullcalendar';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {take} from 'rxjs/operators/take';
import {User} from '../../account/user';
import {AccountUserTypes, IAccountFileRecord, IAppointment} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {filterUndefined} from '../../util/filter';


/**
 * Angular component for account appointments UI.
 */
@Component({
	selector: 'cyph-account-appointments',
	styleUrls: ['./account-appointments.component.scss'],
	templateUrl: './account-appointments.component.html'
})
export class AccountAppointmentsComponent implements AfterViewInit {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;
	
	/** @ignore */
	private calendarEvents: {end: number; start: number; title: string}[]	= [];

	/** @see CalendarComponent */
	@ViewChild(CalendarComponent) public calendar?: CalendarComponent;

	/** Calendar configuration. */
	public readonly calendarOptions: Options	= {
		defaultView: 'agendaDay',
		editable: false,
		eventLimit: false,
		eventSources: [
			{
				events: (_START: any, _END: any, _TIMEZONE: any, callback: Function) => {
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

	/** Gets appointment. */
	public readonly getAppointment:
		(record: IAccountFileRecord) => Promise<
			{appointment: IAppointment; friend: string}|undefined
		>
	= memoize(async (record: IAccountFileRecord) => {
		const currentUser	= this.accountDatabaseService.currentUser.value;

		if (!currentUser) {
			return;
		}

		const appointment	= await this.accountFilesService.downloadAppointment(record).result;

		const friend		= (appointment.participants || []).
			filter(participant => participant !== currentUser.user.username)
		[0];

		if (!friend) {
			return;
		}

		return {appointment, friend};
	});

	/** Gets user. */
	public readonly getUser: (username: string) => Promise<User|undefined>	=
		memoize(async (username: string) =>
			this.accountUserLookupService.getUser(username)
		)
	;

	/** @see trackByID */
	public readonly trackByID: typeof trackByID		= trackByID;

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

		this.accountFilesService.filesListFiltered.appointments.pipe(
			mergeMap(async records => Promise.all(records.map(async record =>
				((await this.getAppointment(record)) || {appointment: undefined}).appointment
			)))
		).subscribe(appointments => {
			this.calendarEvents	= filterUndefined(appointments).
				filter(appointment =>
					appointment.calendarInvite.endTime !== undefined &&
					appointment.calendarInvite.startTime !== undefined &&
					appointment.calendarInvite.title !== undefined
				).map(appointment => ({
					end: <number> appointment.calendarInvite.endTime,
					start: <number> appointment.calendarInvite.startTime,
					title: <string> appointment.calendarInvite.title
				}))
			;

			if (this.calendar) {
				this.calendar.fullCalendar('refetchEvents');
			}
		});
	}

	constructor (
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
	) {}
}
