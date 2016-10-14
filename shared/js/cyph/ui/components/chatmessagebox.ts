import {FileInput} from './fileinput';
import {Templates} from '../templates';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {IChat} from '../chat/ichat';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for chat message box.
 */
export class ChatMessageBox {
	/** Module/component title. */
	public static title: string	= 'cyphChatMessageBox';

	private Cyph: any;
	private self: IChat;

	constructor ($scope, $element, $attrs) { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];

		/* Allow enter press to submit, except on
			mobile without external keyboard */
		$element.find('textarea').keypress(e => {
			if (
				(Env.isMobile && VirtualKeyboardWatcher.isOpen) ||
				(e.keyCode !== 13 || e.shiftKey)
			) {
				return;
			}

			e.preventDefault();
			this.self.send();
		});
	})(); }

	private static _	= (() => {
		angular.module(
			ChatMessageBox.title,
			['ngMaterial', FileInput.title]
		).component(ChatMessageBox.title, {
			bindings: {
				self: '<'
			},
			controller: ChatMessageBox,
			template: Templates.chatMessageBox
		});
	})();
}
