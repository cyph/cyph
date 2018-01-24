import {Component} from '@angular/core';
import {ModalDialogParams} from 'nativescript-angular/modal-dialog';


/**
 * Native Angular component for image dialog.
 */
@Component({
	selector: 'cyph-dialog-image',
	styleUrls: ['../../js/cyph/components/dialog-image/dialog-image.component.scss'],
	templateUrl: '../../js/cyph/components/dialog-image/dialog-image.component.html'
})
export class DialogImageComponent {
	/** Image src. */
	public src: string;

	constructor (params: ModalDialogParams) {
		this.src	= params.context;
	}
}
