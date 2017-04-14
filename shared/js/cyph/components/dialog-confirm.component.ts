import {Component} from '@angular/core';
import {MdDialogRef} from '@angular/material';


/**
 * Angular component for confirm dialog.
 */
@Component({
	selector: 'cyph-dialog-confirm',
	styleUrls: ['../../css/components/dialog-confirm.css'],
	templateUrl: '../../../templates/dialog-confirm.html'
})
export class DialogConfirmComponent {
	/** Cancel button text. */
	public cancel: string;

	/** Content. */
	public content: string;

	/** OK button text. */
	public ok: string;

	/** Title. */
	public title: string;

	constructor (
		/** Dialog instance */
		public readonly mdDialogRef: MdDialogRef<DialogConfirmComponent>
	) {}
}
