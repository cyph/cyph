import {Subject} from 'rxjs/Subject';
import {ISession} from '../cyph/session/isession';


/**
 * Bridge between the demo service and chat UI.
 */
export class ChatData {
	/** Gives command to start. */
	public resolveStart: () => void;

	/** Awaits command to start. */
	public readonly start: Promise<void>;

	constructor (
		/** Indicates whether to display the mobile chat UI. */
		public readonly isMobile: boolean,

		/** @see ISession */
		public readonly session: ISession,

		/** Stream of messages to send. */
		public readonly message: Subject<string> = new Subject<string>(),

		/** Stream of commands to scroll down. */
		public readonly scrollDown: Subject<void> = new Subject<void>(),

		/** Stream of commands to show the cyphertext UI. */
		public readonly showCyphertext: Subject<void> = new Subject<void>()
	) {
		/* tslint:disable-next-line:promise-must-complete */
		this.start	= new Promise<void>(resolve => {
			this.resolveStart	= resolve;
		});
	}
}
