import {ChangeDetectionStrategy, Component} from '@angular/core';

/**
 * Empty component for Cyph SDK.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-sdk',
	template: '<router-outlet></router-outlet>'
})
export class AppComponent {
	constructor () {}
}
