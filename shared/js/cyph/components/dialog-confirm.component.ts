import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';


/**
 * Angular component for confirm dialog.
 */
@Component({
	selector: 'cyph-dialog-confirm',
	styleUrls: ['../../../css/components/dialog-confirm.scss'],
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
		public readonly mdDialogRef: MatDialogRef<DialogConfirmComponent>
	) {}
}
