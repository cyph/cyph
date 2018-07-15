import {ChangeDetectionStrategy, Component} from '@angular/core';


/**
 * AppComponent wrapper for Angular Router, as part of a temporary workaround
 * for server-side rendering before we fully migrate to Angular Router.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-router',
	template: '<router-outlet></router-outlet>'
})
export class RouterComponent {
	constructor () {}
}
