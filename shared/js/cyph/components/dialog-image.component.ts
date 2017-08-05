import {Component} from '@angular/core';


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

	constructor () {}
}
