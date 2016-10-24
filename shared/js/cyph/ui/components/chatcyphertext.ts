import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for chat cyphertext UI.
 */
export class ChatCyphertext {
	/** Component title. */
	public static title: string	= 'cyphChatCyphertext';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: ChatCyphertext,
		template: Templates.chatCyphertext
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
