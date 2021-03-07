import {Injectable} from '@angular/core';
import {BaseProvider} from '../cyph/base-provider';
import {INotificationService} from '../cyph/service-interfaces/inotification.service';

/**
 * Mocks notification service and discards all notification messages.
 */
@Injectable()
export class SilentNotificationService extends BaseProvider
	implements INotificationService {
	/** @inheritDoc */
	public notify (_MESSAGE: string) : void {}

	constructor () {
		super();
	}
}
