import {Injectable} from '@angular/core';
import {urlState} from '../cyph/url-state';
import {util} from '../cyph/util';
import {BetaStates, States, urlSections} from './enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see States */
	public state: States;

	/** @see BetaStates */
	public betaState: BetaStates|undefined;

	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	/** @ignore */
	private onUrlStateChange (newUrlState: string) : void {
		if (newUrlState === urlSections.root) {
			return;
		}

		const newUrlStateSplit: string[]	= newUrlState.split('/');

		if (newUrlStateSplit[0] === urlSections.beta) {
			this.betaState	= (<any> BetaStates)[newUrlStateSplit[1]];
			this.state		= States.beta;
		}
		else if (newUrlState === urlState.states.notFound) {
			this.state		= States.error;
		}
		else {
			urlState.setUrl(urlState.states.notFound);
			return;
		}

		urlState.setUrl(newUrlState, true, true);
	}

	constructor () {
		urlState.onChange(newUrlState => { this.onUrlStateChange(newUrlState); });

		self.onhashchange	= () => { location.reload(); };
		self.onpopstate		= () => {};


		const urlSection: string	= urlState.getUrlSplit()[0];

		if (urlSection === urlSections.beta) {
			this.state	= States.beta;
			urlState.trigger();
		}
		else {
			this.state	= States.blank;
		}

		(async () => {
			while (this.state === States.blank) {
				await util.sleep();
			}

			await util.sleep();

			$(document.body).addClass('load-complete');
		})();
	}
}
