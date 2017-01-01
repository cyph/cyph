import {Injectable} from '@angular/core';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';


/**
 * Mocks notification service and discards all notification messages.
 */
@Injectable()
export class SilentNotificationService implements NotificationService {
	/** @inheritDoc */
	public disableNotify: boolean				= false;

	/** @inheritDoc */
	public readonly openNotifications: any[]	= [];

	/** @inheritDoc */
	public notify (_MESSAGE: string) : void {}

	constructor (
		/** @inheritDoc */
		public readonly visibilityWatcherService: VisibilityWatcherService
	) {}
}
