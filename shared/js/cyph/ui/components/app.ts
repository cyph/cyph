import {Beta} from './beta';
import {ChatCyphertext} from './chatcyphertext';
import {ChatMain} from './chatmain';
import {ChatMessageBox} from './chatmessagebox';
import {ChatToolbar} from './chattoolbar';
import {LinkConnection} from './linkconnection';
import {SignupForm} from './signupform';
import {StaticCyphNotFound} from './staticcyphnotfound';
import {StaticCyphSpinningUp} from './staticcyphspinningup';
import {StaticFooter} from './staticfooter';
import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for Cyph UI.
 */
export class App {
	/** Module/component title. */
	public static title: string	= 'cyphApp';

	private Cyph: any;
	private ui: any;

	constructor () { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];
	})(); }

	private static _	= (() => {
		angular.module(App.title, [
			Beta.title,
			ChatCyphertext.title,
			ChatMain.title,
			ChatMessageBox.title,
			ChatToolbar.title,
			LinkConnection.title,
			SignupForm.title,
			StaticCyphNotFound.title,
			StaticCyphSpinningUp.title,
			StaticFooter.title
		]).component(App.title, {
			controller: App,
			template: Templates.app
		});
	})();
}
