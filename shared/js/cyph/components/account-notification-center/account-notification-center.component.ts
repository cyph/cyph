import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountNotificationsService} from '../../services/account-notifications.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {getDateTimeString, watchRelativeDateTimeString} from '../../util/time';

/**
 * Angular component for account notification center UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-notification-center',
	styleUrls: ['./account-notification-center.component.scss'],
	templateUrl: './account-notification-center.component.html'
})
export class AccountNotificationCenterComponent extends BaseProvider {
	/** @see getDateTimeString  */
	public readonly getDateTimeString = getDateTimeString;

	/** If true, will condense notification UI into a single button. */
	@Input() public menuButton: boolean = false;

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** @see watchRelativeDateTimeString  */
	public readonly watchRelativeDateTimeString = watchRelativeDateTimeString;

	constructor (
		/** @see AccountNotificationsService */
		public readonly accountNotificationsService: AccountNotificationsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
