import {Component} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {ChatMessageGeometryService} from '../../services/chat-message-geometry.service';
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
	selector: 'cyph-account-compose-no-providers',
	styleUrls: ['../account-compose/account-compose.component.scss'],
	templateUrl: '../account-compose/account-compose.component.html'
})
export class AccountComposeNoProvidersComponent extends AccountComposeComponent {
	/** @inheritDoc */
	protected readonly hasOwnProviders: boolean	= false;

	constructor (
		activatedRoute: ActivatedRoute,
		router: Router,
		accountChatService: AccountChatService,
		accountFilesService: AccountFilesService,
		chatMessageGeometryService: ChatMessageGeometryService,
		scrollService: ScrollService,
		sessionService: SessionService,
		accountService: AccountService,
		accountDatabaseService: AccountDatabaseService,
		envService: EnvService,
		stringsService: StringsService
	) {
		super(
			activatedRoute,
			router,
			accountChatService,
			accountFilesService,
			chatMessageGeometryService,
			scrollService,
			sessionService,
			accountService,
			accountDatabaseService,
			envService,
			stringsService
		);
	}
}
