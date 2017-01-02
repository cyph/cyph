import {Injectable} from '@angular/core';
import {INotificationService} from '../cyph/service-interfaces/inotification.service';


/**
 * Mocks notification service and discards all notification messages.
 */
@Injectable()
export class SilentNotificationService implements INotificationService {
	/** @inheritDoc */
	public notify (_MESSAGE: string) : void {}

	constructor () {}
}
