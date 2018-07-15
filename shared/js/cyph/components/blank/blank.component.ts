import {ChangeDetectionStrategy, Component} from '@angular/core';


/**
 * Blank screen / no-op.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-blank',
	template: ''
})
export class BlankComponent {
	constructor () {}
}
