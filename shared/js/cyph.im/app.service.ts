import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import * as $ from 'jquery';
import {EnvService} from '../cyph/services/env.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {util} from '../cyph/util';
import {AccountStates, States, urlSections} from './enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see AccountStates */
	public accountState: AccountStates|undefined;

	/** @see AccountStates */
	public accountStates: typeof AccountStates	= AccountStates;

	/** If true, app is locked down. */
	public isLockedDown: boolean	= !!customBuildPassword;

	/** @see States */
	public state: States;

	/** @see States */
	public states: typeof States	= States;

	/** @ignore */
	private onUrlStateChange (newUrlState: string) : void {
		if (newUrlState === urlSections.root) {
			return;
		}

		const newUrlStateSplit: string[]	= newUrlState.split('/');

		if (newUrlStateSplit[0] === urlSections.account) {
			this.accountState	= (<any> AccountStates)[newUrlStateSplit[1]];
			this.state			= States.account;
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
		envService: EnvService,

		titleService: Title,

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
			true,
			true
		);

		self.onhashchange	= () => { location.reload(); };
		self.onpopstate		= () => {};


		const urlSection: string	= this.urlStateService.getUrlSplit()[0];

		if (urlSection === urlSections.account) {
			this.state	= States.account;
			this.urlStateService.trigger();
		}
		else {
			this.state	= States.blank;
		}

		(async () => {
			if (this.isLockedDown) {
				await util.sleep(1000);
			}
			else {
				while (this.state === States.blank) {
					await util.sleep();
				}

				await util.sleep();
			}

			$(document.body).addClass('load-complete');
		})();
	}
}
