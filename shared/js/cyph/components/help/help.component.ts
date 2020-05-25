import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component
} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for help UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-help',
	styleUrls: ['./help.component.scss'],
	templateUrl: './help.component.html'
})
export class HelpComponent extends BaseProvider {
	constructor (
		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
