import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for chat toolbar.
 */
export class ChatToolbar {
	/** Component title. */
	public static title: string	= 'cyphChatToolbar';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: ChatToolbar,
		template: Templates.chatToolbar
	};


	public Cyph: any;
	public self: IChat;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }
}
