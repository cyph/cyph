import {Injectable} from '@angular/core';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {AccountNotification, IAccountNotification} from '../proto';
import {AccountDatabaseService} from './crypto/account-database.service';

/**
 * Angular service for account notifications.
 */
@Injectable()
export class AccountNotificationsService extends BaseProvider {
	/** Notification history. */
	public readonly notifications = this.accountDatabaseService.watchListWithKeys<
		IAccountNotification
	>(
		'notifications',
		AccountNotification,
		SecurityModels.unprotected,
		undefined,
		undefined,
		this.subscriptions
	);

	/** Mark a notification as read. */
	public async markAsRead (notification: {
		id: string;
		value: IAccountNotification;
	}) : Promise<void> {
		await this.accountDatabaseService.setItem<IAccountNotification>(
			`notifications/${notification.id}`,
			AccountNotification,
			{...notification.value, isRead: true},
			SecurityModels.unprotected
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {
		super();
	}
}
