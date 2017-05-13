import {Component} from '@angular/core';
import {ModalDialogParams} from 'nativescript-angular/modal-dialog';


/**
 * Native Angular component for image dialog.
 */
@Component({
	selector: 'cyph-dialog-image',
	styleUrls: ['./css/components/dialog-image.scss'],
	templateUrl: './templates/dialog-image.html'
})
export class DialogImageComponent {
	/** Image src. */
	public src: string;

	constructor (params: ModalDialogParams) {
		this.src	= params.context;
	}
}
