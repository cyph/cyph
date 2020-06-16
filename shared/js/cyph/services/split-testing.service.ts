import {Inject, Injectable, Optional} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../base-provider';
import {random} from '../util/random';
import {AnalyticsService} from './analytics.service';

/** Used for very basic A/B testing. */
@Injectable()
export class SplitTestingService extends BaseProvider {
	/** @ignore */
	private readonly getValueInternal = memoize(
		(analEvent: string, values: any) => {
			if (values === undefined) {
				values = [true, false];
			}

			let index: number;

			if (typeof values === 'number') {
				index = random(values);
				values = undefined;
			}
			else if (values.length < 1) {
				throw new Error('No values.');
			}

			(<any[]> values)
				.map(o =>
					typeof o === 'object' &&
					'value' in o &&
					typeof o.weight === 'number' ?
						new Array(o.weight).fill(o.value) :
						[o]
				)
				.flat();

			index = Math.floor(values.length * random());

			if (this.analyticsService) {
				this.analyticsService.sendEvent(
					`abtesting-${analEvent}`,
					index.toString()
				);
			}

			return values === undefined ? index : values[index];
		}
	);

	/**
	 * Gets value based on split testing group and logs analytics event.
	 * analEvent must be unique for any given call to this method.
	 *
	 * @param values If unspecified, returns true or false.
	 * If number, returns a positive integer less than its value.
	 * If array, randomly returns one of its values.
	 * If empty array, throws exception.
	 * Any array value may optionally specify weight, a multiplier for the odds of its selection;
	 * e.g. ['foo', {value: 'bar', weight: 2}] is equivalent to ['foo', 'bar', 'bar'].
	 */
	public getValue (analEvent: string, values?: never) : boolean;
	public getValue (analEvent: string, values: number) : number;
	public getValue<T> (
		analEvent: string,
		values: (T | {value: T; weight: number})[]
	) : T;
	public getValue (analEvent: string, values: any) : any {
		return this.getValueInternal(analEvent, values);
	}

	constructor (
		/** @ignore */
		@Inject(AnalyticsService)
		@Optional()
		private readonly analyticsService: AnalyticsService | undefined
	) {
		super();
	}
}
