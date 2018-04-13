import {Component} from '@angular/core';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for upload ehr credentials UI.
 */
@Component({
	selector: 'cyph-upload-ehr-credentials',
	styleUrls: ['./upload-ehr-credentials.component.scss'],
	templateUrl: './upload-ehr-credentials.component.html'
})
export class UploadEhrCredentialsComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
