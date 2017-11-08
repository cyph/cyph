import {Injectable} from '@angular/core';
import {random} from '../util/random';
import {AnalyticsService} from './analytics.service';


/** Used for very basic A/B testing. */
@Injectable()
export class SplitTestingService {
	/** Indicates whether this client has been placed in group A. */
	public readonly groupA: boolean	= random() > 0.5;

	/** Indicates whether this client has been placed in group B. */
	public readonly groupB: boolean	= !this.groupA;

	constructor (analyticsService: AnalyticsService) {
		analyticsService.sendEvent({
			eventAction:
				this.groupA ? 'A' :
				this.groupB ? 'B' :
				''
			,
			eventCategory: 'abtesting',
			eventValue: 1,
			hitType: 'event'
		});
	}
}
