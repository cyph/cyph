import {Subject} from 'rxjs/Subject';
import {ISession} from '../cyph/session/isession';


/**
 * Bridge between the demo service and chat UI.
 */
export class ChatData {
	constructor (
		/** @see ISession */
		public readonly session: ISession,

		/** Stream of messages to send. */
		public readonly message: Subject<string> = new Subject<string>(),

		/** Stream of commands to scroll down. */
		public readonly scrollDown: Subject<void> = new Subject<void>(),

		/** Stream of commands to show the cyphertext UI. */
		public readonly showCyphertext: Subject<void> = new Subject<void>()
	) {}
}
