import {Observable} from 'rxjs/Observable';
import {ChatMessage as ChatMessageInternal, IChatMessage} from '../../proto';
import {Timer} from '../timer';
import {getTimeString} from '../util/time';
import {sleep} from '../util/wait';


/** @inheritDoc */
export class ChatMessage implements IChatMessage {
	/** @see ChatMessageInternal.AuthorTypes */
	/* tslint:disable-next-line:variable-name */
	public static readonly AuthorTypes: typeof ChatMessageInternal.AuthorTypes	=
		ChatMessageInternal.AuthorTypes
	;


	/** @inheritDoc */
	public authorID?: string			= this.message.authorID;

	/** @inheritDoc */
	public authorType: ChatMessageInternal.AuthorTypes	= this.message.authorType;

	/** @inheritDoc */
	public id: string					= this.message.id;

	/** @inheritDoc */
	public selfDestructTimeout?: number	= this.message.selfDestructTimeout;

	/** @inheritDoc */
	public readonly selfDestructTimer?: Timer;

	/** @inheritDoc */
	public text: string					= this.message.text;

	/** @inheritDoc */
	public timestamp: number			= this.message.timestamp;

	/** @inheritDoc */
	public readonly timeString: string	= getTimeString(this.message.timestamp);

	constructor (
		/** @ignore */
		private readonly message: IChatMessage,

		/** Author of this message. */
		public readonly author: Observable<string>
	) {
		if (
			this.message.selfDestructTimeout === undefined ||
			isNaN(this.message.selfDestructTimeout) ||
			this.message.selfDestructTimeout < 1
		) {
			return;
		}

		this.selfDestructTimer	= new Timer(this.message.selfDestructTimeout);

		this.selfDestructTimer.start().then(async () => {
			await sleep(10000);
			this.message.text	= '';
			this.text			= '';
		});
	}
}
