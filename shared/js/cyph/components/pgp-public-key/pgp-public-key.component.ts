import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	Input,
	OnChanges,
	OnInit
} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {User} from '../../account';
import {BaseProvider} from '../../base-provider';
import {IAccountUserProfileExtra} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
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
export class PGPPublicKeyComponent extends BaseProvider
	implements OnChanges, OnInit {
	/** @see copyToClipboard */
	public readonly copyToClipboard = copyToClipboard;

	/** Gets title. */
	public readonly getTitle = memoize((name: string) =>
		name ?
			this.stringsService.setParameters(
				this.stringsService.pgpPublicKeyTitle,
				{name}
			) :
			this.stringsService.pgpPublicKey
	);

	/** @see User */
	@Input() public user?: User;

	/** @see IAccountUserProfileExtra */
	public readonly userProfileExtra = new BehaviorSubject<
		IAccountUserProfileExtra | undefined
	>(undefined);

	/** Indicates whether or not this key is verified. */
	public readonly verified = new BehaviorSubject<boolean | undefined>(
		undefined
	);

	/** @ignore */
	private async updateData () : Promise<void> {
		this.userProfileExtra.next(undefined);
		this.verified.next(undefined);

		const userProfileExtra = await this.user?.accountUserProfileExtra.getValue();

		const verified = await this.accountFilesService.pgp.verifyPublicKey(
			this.user?.username,
			userProfileExtra?.pgp?.publicKey,
			userProfileExtra?.pgp?.publicKeyVerification
		);

		this.userProfileExtra.next(userProfileExtra);
		this.verified.next(verified);
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.updateData();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.updateData();
	}

	constructor (
		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

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
