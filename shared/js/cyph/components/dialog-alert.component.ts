import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for alert dialog.
 */
@Component({
	selector: 'cyph-dialog-alert',
	styleUrls: ['../../../css/components/dialog-alert.scss'],
	templateUrl: '../../../templates/dialog-alert.html'
})
export class DialogAlertComponent {
	/** Content. */
	public content: string;

	/** OK button text. */
	public ok: string;

	/** Title. */
	public title: string;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
