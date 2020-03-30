import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {getDateTimeString} from '../../util/time';
import { extend, Internationalization } from '@syncfusion/ej2-base';
import {EventSettingsModel,
		DayService,
		WeekService,
		WorkWeekService,
		MonthService,
		AgendaService,
		ResizeService,
		DragAndDropService } from '@syncfusion/ej2-angular-schedule';

/**
 * Angular component for account appointment agenda/scheduler.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-appointment-agenda',
	styleUrls: ['./account-appointment-agenda.component.scss'],
	templateUrl: './account-appointment-agenda.component.html',
	providers: [DayService, WeekService, WorkWeekService,
		MonthService, AgendaService, ResizeService, DragAndDropService]
})
export class AccountAppointmentAgendaComponent extends BaseProvider implements OnInit {

	/** @ignore */
	private instance: Internationalization = new Internationalization();

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** @see selectedDate */
	public selectedDate: Date = new Date();

	/** @see eventSettings */
	public eventSettings: EventSettingsModel = { dataSource: <Object[]>extend([],
		this.accountAppointmentsService.appointments.upcoming, undefined, true) };

	/** @see getTimeString */
	public getTimeString(value: Date): string {
		return this.instance.formatDate(value, { skeleton: 'hm' });
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see EnvService */
		public readonly envService: EnvService,

	) {
		super();
	}
}
