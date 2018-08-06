import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for alert dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-alert',
	styleUrls: ['./dialog-alert.component.scss'],
	templateUrl: './dialog-alert.component.html'
})
export class DialogAlertComponent extends BaseProvider {
	/** Content. */
	public content?: string;

	/** Indicates whether content is Markdown. */
	public markdown: boolean	= false;

	/** OK button text. */
	public ok?: string;

	/** Title. */
	public title?: string;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
