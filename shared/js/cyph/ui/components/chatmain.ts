import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for main chat UI.
 */
export class ChatMain {
	/** Component title. */
	public static title: string	= 'cyphChatMain';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<',
			hideDisconnectMessage: '<'
		},
		controller: ChatMain,
		template: Templates.chatMain,
		transclude: true
	};


	private Cyph: any;
	private self: IChat;
	private hideDisconnectMessage: boolean;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }
}
