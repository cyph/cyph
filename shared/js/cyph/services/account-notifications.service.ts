import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {
	AccountNotification,
	AccountFileRecord,
	IAccountNotification,
	NotificationTypes
} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {AccountDatabaseService} from './crypto/account-database.service';
import {AccountFilesService} from './account-files.service';
import {StringsService} from './strings.service';

/**
 * Angular service for account notifications.
 */
@Injectable()
export class AccountNotificationsService extends BaseProvider {
	/** @ignore */
	private readonly defaultNotifications = [
		{
			id: '',
			value: {
				isRead: true,
				text: this.stringsService.noNotifications,
				textDetail: '',
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				timestamp: Date.now(),
				type: NotificationTypes.Yo
			}
		}
	];

	/** Gets route for notification. */
	public readonly getRoute = memoize(
		(notification: {id: string; value: IAccountNotification}) => {
			switch (notification.value.type) {
				case NotificationTypes.File:
					if (
						typeof notification.value.fileType !== 'number' ||
						!(notification.value.fileType in AccountFileRecord)
					) {
						break;
					}

					return this.accountFilesService.config[
						notification.value.fileType
					].route;

				case NotificationTypes.Message:
					return notification.value.messagesID ?
						`/messages/${notification.value.messagesID}` :
						`/messages/users/${notification.value.username}`;
			}

			return `/profile/${notification.value.username}`;
		},
		(notification: {id: string; value: IAccountNotification}) =>
			notification.id
	);

	/** Notification history. */
	public readonly notifications = toBehaviorSubject(
		this.accountDatabaseService
			.watchListWithKeys<IAccountNotification>(
				'notifications',
				AccountNotification,
				SecurityModels.unprotected,
				undefined,
				undefined,
				this.subscriptions
			)
			/* TODO: Better / less arbitrary solution, such as virtual or infinite scrolling */
			.pipe(
				map(notifications => {
					if (notifications.length < 1) {
						return this.defaultNotifications;
					}

					notifications = notifications.sort(({id: a}, {id: b}) =>
						a > b ? -1 : 1
					);

					return notifications.slice(
						0,
						Math.max(
							notifications.findIndex(o => o.value.isRead),
							10
						)
					);
				})
			),
		this.defaultNotifications
	);

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

	/** Mark all notifications as read. */
	public async markAllAsRead () : Promise<void> {
		await Promise.all(
			this.notifications.value.map(async o => this.markAsRead(o))
		);
	}

	/** Mark a notification as read. */
	public async markAsRead (notification: {
		id: string;
		value: IAccountNotification;
	}) : Promise<void> {
		if (!notification.id || notification.value.isRead) {
			return;
		}

		await this.accountDatabaseService.setItem<IAccountNotification>(
			`notifications/${notification.id}`,
			AccountNotification,
			{...notification.value, isRead: true},
			SecurityModels.unprotected
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
