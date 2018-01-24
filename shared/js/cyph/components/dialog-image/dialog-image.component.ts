import {Component} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for image dialog.
 */
@Component({
	selector: 'cyph-dialog-image',
	styleUrls: ['./dialog-image.component.scss'],
	templateUrl: './dialog-image.component.html'
})
export class DialogImageComponent {
	/** Image src. */
	public src?: SafeUrl|string;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
