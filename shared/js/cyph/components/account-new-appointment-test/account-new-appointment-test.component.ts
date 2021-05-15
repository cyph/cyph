import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {isValidEmail} from '../../email-pattern';
import {CallTypes} from '../../proto';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {toInt} from '../../util/formatting';

/**
 * Angular component for account new appointment test UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-new-appointment-test',
	styleUrls: ['./account-new-appointment-test.component.scss'],
	templateUrl: './account-new-appointment-test.component.html'
})
export class AccountNewAppointmentTestComponent
	extends BaseProvider
	implements OnInit
{
	/** Defaults. */
	private readonly defaultSettings = {
		guestEmail: 'balls@cyph.com',
		numberOfGuests: 3
	};

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		let numberOfGuests = toInt(
			await this.dialogService.prompt({
				content:
					this.stringsService.newAppointmentTestNumberOfGuestsContent,
				placeholder:
					this.stringsService
						.newAppointmentTestNumberOfGuestsPlaceholder,
				preFill: this.defaultSettings.numberOfGuests.toString(),
				title: this.stringsService.newAppointmentTestTitle
			})
		);

		if (!numberOfGuests) {
			numberOfGuests = this.defaultSettings.numberOfGuests;
		}

		let guestEmail = await this.dialogService.prompt({
			content: this.stringsService.newAppointmentTestGuestEmailContent,
			placeholder:
				this.stringsService.newAppointmentTestGuestEmailPlaceholder,
			preFill: this.defaultSettings.guestEmail,
			title: this.stringsService.newAppointmentTestTitle
		});

		if (!isValidEmail(guestEmail)) {
			guestEmail = this.defaultSettings.guestEmail;
		}

		const {appointment} =
			await this.accountAppointmentsService.sendAppointmentNoUpload(
				{
					callType: CallTypes.Video,
					description: '',
					endTime: 0,
					startTime: 0,
					title: ''
				},
				new Array(numberOfGuests).fill(0).map((_, i) => ({
					email: guestEmail,
					name: this.stringsService.setParameters(
						this.stringsService.burnerGroupDefaultMemberName,
						{i: (i + 1).toString()}
					)
				}))
			);

		if (!appointment.calendarInvite.url) {
			return;
		}

		location.href = appointment.calendarInvite.url;
	}

	constructor (
		/** @ignore */
		private readonly accountAppointmentsService: AccountAppointmentsService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
