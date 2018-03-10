import {Component} from '@angular/core';
import {ControlContainer, NG_VALUE_ACCESSOR, NgForm} from '@angular/forms';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {CalendarInviteComponent} from '../calendar-invite';


/**
 * Provides existing NgForm.
 * @see CalendarInviteComponent
 */
@Component({
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: CalendarInviteInheritNgFormComponent
		}
	],
	selector: 'cyph-calendar-invite-inherit-ng-form',
	styleUrls: ['../calendar-invite/calendar-invite.component.scss'],
	templateUrl: '../calendar-invite/calendar-invite.component.html',
	viewProviders: [{provide: ControlContainer, useExisting: NgForm}]
})
export class CalendarInviteInheritNgFormComponent extends CalendarInviteComponent {
	constructor (
		envService: EnvService,
		stringsService: StringsService
	) {
		super(
			envService,
			stringsService
		);
	}
}
