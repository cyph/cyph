import {ChatCyphertext} from './chatcyphertext';
import {ChatMain} from './chatmain';
import {ChatMessageBox} from './chatmessagebox';
import {ChatToolbar} from './chattoolbar';
import {Checkout} from './checkout';
import {Contact} from './contact';
import {SignupForm} from './signupform';
import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for Cyph UI.
 */
export class Home {
	/** Module/component title. */
	public static title: string	= 'cyphHome';

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
		angular.module(Home.title, [
			'ngMaterial',
			ChatCyphertext.title,
			ChatMain.title,
			ChatMessageBox.title,
			ChatToolbar.title,
			Checkout.title,
			Contact.title,
			SignupForm.title
		]).component(Home.title, {
			controller: Home,
			template: Templates.home
		});
	})();
}
