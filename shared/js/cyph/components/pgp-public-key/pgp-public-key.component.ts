import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	Input
} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {User} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {StringsService} from '../../services/strings.service';
import {copyToClipboard} from '../../util/clipboard';

/**
 * Angular component for PGP public key UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-pgp-public-key',
	styleUrls: ['./pgp-public-key.component.scss'],
	templateUrl: './pgp-public-key.component.html'
})
export class PGPPublicKeyComponent extends BaseProvider {
	/** @see copyToClipboard */
	public readonly copyToClipboard = copyToClipboard;

	/** Gets title. */
	public readonly getTitle = memoize((name: string) =>
		this.stringsService.setParameters(
			this.stringsService.pgpPublicKeyTitle,
			{name}
		)
	);

	/** @see User */
	@Input() public user?: User;

	constructor (
		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
