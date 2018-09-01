import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {AccountComposeComponent} from '../account-compose';


/**
 * Angular component for account compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-compose-no-providers',
	styleUrls: ['../account-compose/account-compose.component.scss'],
	templateUrl: '../account-compose/account-compose.component.html'
})
export class AccountComposeNoProvidersComponent extends AccountComposeComponent {
	/** @inheritDoc */
	protected readonly hasOwnProviders: boolean	= false;

	constructor (
		activatedRoute: ActivatedRoute,
		accountChatService: AccountChatService,
		accountContactsService: AccountContactsService,
		accountFilesService: AccountFilesService,
		scrollService: ScrollService,
		sessionService: SessionService,
		accountService: AccountService,
		accountDatabaseService: AccountDatabaseService,
		envService: EnvService,
		stringsService: StringsService
	) {
		super(
			activatedRoute,
			accountChatService,
			accountContactsService,
			accountFilesService,
			scrollService,
			sessionService,
			accountService,
			accountDatabaseService,
			envService,
			stringsService
		);
	}
}
