import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';


/**
 * Blank screen / no-op.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-blank',
	template: ''
})
export class BlankComponent extends BaseProvider {
	constructor () {
		super();
	}
}
