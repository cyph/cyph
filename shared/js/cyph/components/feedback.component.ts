import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for submitting feedback.
 */
@Component({
	selector: 'cyph-feedback',
	styleUrls: ['../../../css/components/feedback.scss'],
	templateUrl: '../../../templates/feedback.html'
})
export class FeedbackComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
