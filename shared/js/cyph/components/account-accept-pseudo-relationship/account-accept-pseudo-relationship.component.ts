import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account accept pseudo relationship UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-accept-pseudo-relationship',
	styleUrls: ['./account-accept-pseudo-relationship.component.scss'],
	templateUrl: './account-accept-pseudo-relationship.component.html'
})
export class AccountAcceptPseudoRelationshipComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
