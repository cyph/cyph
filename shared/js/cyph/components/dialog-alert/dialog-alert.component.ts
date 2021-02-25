import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component
} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
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

	/** An image to display. */
	public image?: SafeUrl;

	/** Indicates whether content is Markdown. */
	public markdown: boolean = false;

	/** OK button text. */
	public ok?: string;

	/** Title. */
	public title?: string;

	constructor (
		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
