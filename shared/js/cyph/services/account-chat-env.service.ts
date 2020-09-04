import {Injectable} from '@angular/core';
import {env} from '../env';
import {ChatEnvService} from './chat-env.service';
import {ConfigService} from './config.service';
import {LocalStorageService} from './local-storage.service';
import {SessionInitService} from './session-init.service';
import {SessionWrapperService} from './session-wrapper.service';

/**
 * Replaces a subset of the chat env service for the accounts UI.
 */
@Injectable()
export class AccountChatEnvService extends ChatEnvService {
	/** @inheritDoc */
	public readonly isAccounts: boolean = true;

	/** @inheritDoc */
	public readonly pro = env.pro;

	/** @inheritDoc */
	public readonly telehealthTheme = env.telehealthTheme;

	constructor (
		localStorageService: LocalStorageService,
		configService: ConfigService,
		sessionInitService: SessionInitService,
		sessionWrapperService: SessionWrapperService
	) {
		super(
			localStorageService,
			configService,
			sessionInitService,
			sessionWrapperService
		);
	}
}
