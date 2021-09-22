import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../../base-provider';
import {StringProto} from '../../proto';
import {AccountService} from '../../services/account.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';
import {request} from '../../util/request';

/**
 * Angular component for generating free invite code and redirecting to /register.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-generate-invite-code',
	styleUrls: ['./account-generate-invite-code.component.scss'],
	templateUrl: './account-generate-invite-code.component.html'
})
export class AccountGenerateInviteCodeComponent
	extends BaseProvider
	implements OnInit
{
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();
		this.accountService.interstitial.next(true);

		let newInviteCodeGenerated = false;

		const inviteCode = await this.localStorageService.getOrSetDefault(
			'pendingInviteCode',
			StringProto,
			async () => {
				newInviteCodeGenerated = true;
				return request({url: this.envService.baseUrl + 'invitecode'});
			}
		);

		this.accountService.interstitial.next(false);
		await this.router.navigate(['register', inviteCode]);

		if (!newInviteCodeGenerated) {
			return;
		}

		await this.dialogService.toast(
			this.stringsService.freeInviteCode,
			0,
			this.stringsService.thanks
		);
	}

	constructor (
		/** @see Router */
		private readonly router: Router,

		/** @see AccountService */
		private readonly accountService: AccountService,

		/** @see DialogService */
		private readonly dialogService: DialogService,

		/** @see EnvService */
		private readonly envService: EnvService,

		/** @see LocalStorageService */
		private readonly localStorageService: LocalStorageService,

		/** @see StringsService */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
