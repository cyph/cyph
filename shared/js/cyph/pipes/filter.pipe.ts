import {Pipe, PipeTransform} from '@angular/core';

/**
 * Filters array based on function.
 */
@Pipe({
	name: 'cyphFilter',
	pure: true
})
export class FilterPipe implements PipeTransform {
	/** @inheritDoc */
	public transform (value: any, filterFunction: any) : any {
		if (!(value instanceof Array && filterFunction instanceof Function)) {
			return value;
		}

		return value.filter(filterFunction);
	}

	constructor () {}
}
