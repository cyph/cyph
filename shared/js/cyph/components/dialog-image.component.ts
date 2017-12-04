import {Component} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for image dialog.
 */
@Component({
	selector: 'cyph-dialog-image',
	styleUrls: ['../../../css/components/dialog-image.scss'],
	templateUrl: '../../../templates/dialog-image.html'
})
export class DialogImageComponent {
	/** Image src. */
	public src: SafeUrl|string;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
