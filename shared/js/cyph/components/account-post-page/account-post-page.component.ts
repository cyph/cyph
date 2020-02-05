import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post page UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-page',
	styleUrls: ['./account-post-page.component.scss'],
	templateUrl: './account-post-page.component.html'
})
export class AccountPostPageComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
