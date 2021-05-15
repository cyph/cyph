import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post feed page UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-feed-page',
	styleUrls: ['./account-post-feed-page.component.scss'],
	templateUrl: './account-post-feed-page.component.html'
})
export class AccountPostFeedPageComponent
	extends BaseProvider
	implements OnInit
{
	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
