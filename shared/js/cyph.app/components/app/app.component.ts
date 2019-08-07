import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../../cyph/base-provider';
import {AppService} from '../../app.service';

/**
 * Angular component for Cyph web UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-app',
	templateUrl: './app.component.html'
})
export class AppComponent extends BaseProvider {
	constructor (
		/** @see AppService */
		public readonly appService: AppService
	) {
		super();
	}
}
