import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component
} from '@angular/core';
import {ControlContainer, NG_VALUE_ACCESSOR, NgForm} from '@angular/forms';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {CalendarInviteComponent} from '../calendar-invite';

/**
 * Provides existing NgForm.
 * @see CalendarInviteComponent
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: CalendarInviteInheritNgFormComponent
		}
	],
	selector: 'cyph-calendar-invite-inherit-ng-form',
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	styleUrls: ['../calendar-invite/calendar-invite.component.scss'],
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	templateUrl: '../calendar-invite/calendar-invite.component.html',
	viewProviders: [{provide: ControlContainer, useExisting: NgForm}]
})
export class CalendarInviteInheritNgFormComponent extends CalendarInviteComponent {
	constructor (
		changeDetectorRef: ChangeDetectorRef,
		envService: EnvService,
		stringsService: StringsService
	) {
		super(changeDetectorRef, envService, stringsService);
	}
}
