import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for social share UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-social-share',
	styleUrls: ['./social-share.component.scss'],
	templateUrl: './social-share.component.html'
})
export class SocialShareComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
