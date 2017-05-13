import {Component} from '@angular/core';
import {ModalDialogParams} from 'nativescript-angular/modal-dialog';
import {DialogImageComponent} from './js/cyph/components/dialog-image.component';


/**
 * Native Angular component for image dialog.
 */
@Component({
	selector: 'cyph-dialog-image',
	styleUrls: ['./css/components/dialog-image.scss'],
	templateUrl: './templates/dialog-image.html'
})
export class NativeDialogImageComponent extends DialogImageComponent {
	constructor (params: ModalDialogParams) {
		super();

		this.src	= params.context;
	}
}
