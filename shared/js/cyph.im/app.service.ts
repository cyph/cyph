import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import * as $ from 'jquery';
import {States as AccountStates} from '../cyph/account/enums';
import {AccountAuthService} from '../cyph/services/account-auth.service';
import {AccountService} from '../cyph/services/account.service';
import {EnvService} from '../cyph/services/env.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {util} from '../cyph/util';
import {States, urlSections} from './enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see States */
	public state: States;

	/** @see States */
	public states: typeof States	= States;

	/** @ignore */
	private get urlSection () : string {
		return this.urlStateService.getUrlSplit()[0];
	}

	/** @ignore */
	private onUrlStateChange (newUrlState: string) : void {
		if (newUrlState === urlSections.root) {
			return;
		}

		const newUrlStateSplit: string[]	= newUrlState.split('/');

		if (newUrlStateSplit[0] === urlSections.account) {
			const accountState: AccountStates|undefined	=
				(<any> AccountStates)[newUrlStateSplit[1]]
			;

			if (accountState === AccountStates.home) {
				this.urlStateService.setUrl(urlSections.account);
				return;
			}

			this.accountService.state	=
				accountState === undefined ? AccountStates.home : accountState
			;

			this.accountService.input	= newUrlStateSplit[2];
			this.state					= States.account;
		}
		else if (newUrlState === this.urlStateService.states.notFound) {
			this.state		= States.error;
		}
		else {
			this.urlStateService.setUrl(this.urlStateService.states.notFound);
			return;
		}

		this.urlStateService.setUrl(newUrlState, true, true);
	}

	constructor (
		accountAuthService: AccountAuthService,

		envService: EnvService,

		faviconService: FaviconService,

		titleService: Title,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly urlStateService: UrlStateService
	) {
		if (!envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			this.state	= States.blank;
			return;
		}

		titleService.setTitle(util.translate(titleService.getTitle()));

		this.urlStateService.onChange(
			newUrlState => { this.onUrlStateChange(newUrlState); },
			true
		);

		self.onhashchange	= () => { location.reload(); };
		self.onpopstate		= () => {};


		/* Handle special cases */
		if (this.urlSection === urlSections.extension) {
			this.accountService.isExtension		= true;
			this.urlStateService.setUrl('account/contacts');
		}
		else if (this.urlSection === urlSections.telehealth) {
			this.accountService.isTelehealth	= true;
			$(document.body).addClass('telehealth');
			faviconService.setFavicon('telehealth');
			this.urlStateService.setUrl('account');
		}

		if (this.urlSection === urlSections.account) {
			this.state	= States.account;
			this.urlStateService.trigger();
		}
		else {
			this.state	= States.blank;
		}

		(async () => {
			if (this.state === States.account) {
				$(document.body).addClass('loading-accounts');
				await accountAuthService.ready;
			}
			else {
				while (this.state === States.blank) {
					await util.sleep();
				}
			}

			await util.sleep();

			$(document.body).addClass('load-complete');
		})();
	}
}
