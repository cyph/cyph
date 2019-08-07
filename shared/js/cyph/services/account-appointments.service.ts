import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {combineLatest, Observable, of} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {IAccountFileRecord, IAppointment} from '../proto';
import {filterUndefined} from '../util/filter';
import {observableAll} from '../util/observable-all';
import {watchTimestamp} from '../util/time';
import {AccountFilesService} from './account-files.service';
import {AccountDatabaseService} from './crypto/account-database.service';

/**
 * Account appointments service.
 */
@Injectable()
export class AccountAppointmentsService extends BaseProvider {
	/** Time in ms when user can check in - also used as cuttoff point for end time. */
	private readonly appointmentGracePeriod = 600000;

	/** Gets appointment. */
	private readonly getAppointment = memoize(
		(
			record: IAccountFileRecord
		): Observable<
			{appointment: IAppointment; friend?: string} | undefined
		> =>
			this.accountFilesService.watchAppointment(record).pipe(
				map(appointment => {
					const currentUser = this.accountDatabaseService.currentUser
						.value;

					if (!currentUser) {
						return;
					}

					const friend = (appointment.participants || []).filter(
						participant => participant !== currentUser.user.username
					)[0];

					return {appointment, friend};
				})
			),
		(record: IAccountFileRecord) => record.id
	);

	/** All (unfiltered) appointments. */
	public readonly allAppointments = this.getAppointments(
		this.accountFilesService.filesListFiltered.appointments
	);

	/**
	 * Appointment lists.
	 *
	 * `current`: Ongoing appointments, taking into account grace period.
	 * `future`: Future appointments, taking into account grace period.
	 * `past`: Appointments that have already occurred or passed the grace period.
	 * `upcoming`: Next five ongoing or future appointments.
	 */
	public readonly appointments = {
		current: combineLatest([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						!appointment.occurred &&
						now + this.appointmentGracePeriod >=
							appointment.calendarInvite.startTime &&
						now - this.appointmentGracePeriod <=
							appointment.calendarInvite.endTime
				)
			)
		),
		future: combineLatest([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						!appointment.occurred &&
						now + this.appointmentGracePeriod <
							appointment.calendarInvite.startTime
				)
			)
		),
		incoming: this.getAppointments(
			this.accountFilesService.incomingFilesFiltered.appointments
		),
		past: combineLatest([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						appointment.occurred ||
						now - this.appointmentGracePeriod >
							appointment.calendarInvite.endTime
				)
			)
		),
		upcoming: combineLatest([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments
					.filter(
						({appointment}) =>
							!appointment.occurred &&
							now < appointment.calendarInvite.endTime
					)
					.sort(
						(a, b) =>
							a.appointment.calendarInvite.startTime -
							b.appointment.calendarInvite.startTime
					)
					.slice(0, 5)
			)
		)
	};

	/** List of email contacts from all appointments. */
	public readonly pastEmailContacts = this.allAppointments.pipe(
		map(appointments =>
			Object.entries(
				appointments
					.map(({appointment}) => ({
						email: (appointment.fromEmail || '')
							.trim()
							.toLowerCase(),
						name: (appointment.fromName || '').trim()
					}))
					.filter(({email}) => email)
					.reduce<Record<string, string>>(
						(o, {email, name}) => ({...o, [email]: name}),
						{}
					)
			).map(([email, name]) => ({email, name}))
		)
	);

	/** @ignore */
	private getAppointments (
		recordsList: Observable<IAccountFileRecord[]>
	) : Observable<
		{
			appointment: IAppointment;
			friend?: string;
			record: IAccountFileRecord;
		}[]
	> {
		return recordsList.pipe(
			mergeMap(records =>
				observableAll(
					records
						.map(record =>
							this.getAppointment(record).pipe(
								map(appointment =>
									appointment ?
										{
												id: record.id,
												record,
												...appointment
										  } :
										undefined
								)
							)
						)
						.concat(
							/* Workaround for it not emitting when recordsList changes */
							of(undefined)
						)
				)
			),
			map(filterUndefined)
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService
	) {
		super();
	}
}
