import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {random} from '../util/random';
import {AnalyticsService} from './analytics.service';


/** Used for very basic A/B testing. */
@Injectable()
export class SplitTestingService {
	/** @ignore */
	private readonly getValueInternal	= memoize((analEvent: string, values: any) => {
		if (values === undefined) {
			values	= [true, false];
		}

		if (values.length < 1) {
			throw new Error('No values.');
		}

		const index	= Math.floor(values.length * random());

		this.analyticsService.sendEvent({
			eventAction: index.toString(),
			eventCategory: `abtesting-${analEvent}`,
			eventValue: 1,
			hitType: 'event'
		});

		return values[index];
	});

	/**
	 * Gets value based on split testing group and logs analytics event.
	 * analEvent must be unique for any given call to this method.
	 */
	public getValue (analEvent: string, values?: never) : boolean;
	public getValue <T> (analEvent: string, values: T[]) : T;
	public getValue (analEvent: string, values: any) : any {
		return this.getValueInternal(analEvent, values);
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService
	) {}
}
