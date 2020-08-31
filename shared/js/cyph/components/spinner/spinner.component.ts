import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for spinner UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-spinner',
	styleUrls: ['./spinner.component.scss'],
	templateUrl: './spinner.component.html'
})
export class SpinnerComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
