import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ModalDialogParams} from 'nativescript-angular/modal-dialog';
import {BaseProvider} from '../../js/cyph/base-provider';


/**
 * Native Angular component for image dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-media',
	styleUrls: ['../../js/cyph/components/dialog-media/dialog-media.component.scss'],
	templateUrl: '../../js/cyph/components/dialog-media/dialog-media.component.html'
})
export class DialogMediaComponent extends BaseProvider {
	/** Image src. */
	public src: string;

	/** Image title. */
	public title?: string;

	constructor (params: ModalDialogParams) {
		super();

		this.src	= params.context;
	}
}
