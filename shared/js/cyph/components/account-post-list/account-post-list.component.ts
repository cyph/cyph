import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post list UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-list',
	styleUrls: ['./account-post-list.component.scss'],
	templateUrl: './account-post-list.component.html'
})
export class AccountPostListComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
