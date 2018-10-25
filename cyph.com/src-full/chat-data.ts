import {Subject} from 'rxjs';
import {ISessionMessage, ISessionMessageData} from '../cyph/proto';
import {resolvable} from '../cyph/util/wait';


/**
 * Bridge between the demo service and chat UI.
 */
export class ChatData {
	/** @ignore */
	private readonly _START	= resolvable();

	/** Gives command to start. */
	public readonly resolveStart: () => void	= this._START.resolve;

	/** Awaits command to start. */
	public readonly start: Promise<void>		= this._START.promise;

	constructor (
		/** Indicates whether to display the mobile chat UI. */
		public readonly isMobile: boolean,

		/** Incoming end of local channel. */
		public readonly channelIncoming: Subject<ISessionMessage&{data: ISessionMessageData}> =
			new Subject()
		,

		/** Outgoing end of local channel. */
		public readonly channelOutgoing: Subject<ISessionMessage&{data: ISessionMessageData}> =
			new Subject()
		,

		/** Stream of messages to send. */
		public readonly message: Subject<string> = new Subject(),

		/** Stream of commands to scroll down. */
		public readonly scrollDown: Subject<void> = new Subject(),

		/** Stream of commands to show the cyphertext UI. */
		public readonly showCyphertext: Subject<void> = new Subject()
	) {}
}
