import {Templates} from '../templates';
import {VirtualKeyboardWatcher} from '../virtualkeyboardwatcher';
import {VisibilityWatcher} from '../visibilitywatcher';
import {IChat} from '../chat/ichat';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for chat message box.
 */
export class ChatMessageBox {
	/** Component title. */
	public static title: string	= 'cyphChatMessageBox';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: ChatMessageBox,
		template: Templates.chatMessageBox
	};


	public Cyph: any;
	public self: IChat;

	public isSpeedDialOpen: boolean	= true;

	constructor ($scope, $element) { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];

		/* Allow enter press to submit, except on
			mobile without external keyboard */

		let $textarea: JQuery;
		while (!$textarea || $textarea.length < 1) {
			$textarea	= $element.find('textarea');
			await Util.sleep(100);
		}

		$textarea.keypress(e => {
			if (
				(Env.isMobile && VirtualKeyboardWatcher.isOpen) ||
				e.keyCode !== 13 ||
				e.shiftKey
			) {
				return;
			}

			e.preventDefault();
			this.self.send();
		});

		/* Temporary workaround for Angular Material bug */

		while (
			!VisibilityWatcher.isVisible ||
			$element.find('md-fab-speed-dial:visible').length < 1
		) {
			await Util.sleep(100);
		}

		await Util.sleep(1000);
		this.isSpeedDialOpen	= false;
	})(); }
}
