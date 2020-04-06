import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {AccountNotification, IAccountNotification} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {AccountDatabaseService} from './crypto/account-database.service';

/**
 * Angular service for account notifications.
 */
@Injectable()
export class AccountNotificationsService extends BaseProvider {
	/** Notification history. */
	public readonly notifications = this.accountDatabaseService
		.watchListWithKeys<IAccountNotification>(
			'notifications',
			AccountNotification,
			SecurityModels.unprotected,
			undefined,
			undefined,
			this.subscriptions
		)
		/* TODO: Better / less arbitrary solution, such as virtual or infinite scrolling */
		.pipe(map(notifications => notifications.reverse().slice(0, 100)));

	/**
	 * Unread count.
	 * TODO: Optimize data model.
	 */
	public readonly unreadCount = toBehaviorSubject(
		this.notifications.pipe(
			map(
				notifications =>
					notifications.filter(o => !o.value.isRead).length
			)
		),
		0
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
