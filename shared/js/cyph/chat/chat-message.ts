import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {User} from '../account/user';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {
	ChatMessage as ChatMessageInternal,
	IChatMessage,
	IChatMessageLine,
	IChatMessageValue
} from '../proto';
import {Timer} from '../timer';
import {getDateTimeString, getTimeString} from '../util/time';
import {sleep} from '../util/wait';


/** @inheritDoc */
export class ChatMessage implements IChatMessage {
	/** @see ChatMessageInternal.AuthorTypes */
	/* tslint:disable-next-line:variable-name */
	public static readonly AuthorTypes: typeof ChatMessageInternal.AuthorTypes	=
		ChatMessageInternal.AuthorTypes
	;


	/** @inheritDoc */
	public authorID?: string							= this.message.authorID;

	/** @inheritDoc */
	public authorType: ChatMessageInternal.AuthorTypes	= this.message.authorType;

	/** Human-readable date + time. */
	public readonly dateTimeString: string				= getDateTimeString(
		this.message.timestamp
	);

	/** @inheritDoc */
	public dimensions?: IChatMessageLine[]				= this.message.dimensions;

	/** @inheritDoc */
	public id: string									= this.message.id;

	/** @inheritDoc */
	public selfDestructTimeout?: number					= this.message.selfDestructTimeout;

	/** @inheritDoc */
	public readonly selfDestructTimer?: Timer;

	/** @inheritDoc */
	public timestamp: number							= this.message.timestamp;

	/** Human-readable time. */
	public readonly timeString: string					= getTimeString(this.message.timestamp);

	/** @ignore */
	public value?: IChatMessageValue					= this.message.value && {
		calendarInvite: this.message.value.calendarInvite,
		form: this.message.value.form,
		quill: this.message.value.quill,
		text: this.message.value.text
	};

	/** Observable of value. */
	public readonly valueWatcher: Subject<IChatMessageValue|undefined>	=
		new BehaviorSubject<IChatMessageValue|undefined>(this.value)
	;

	constructor (
		/** @ignore */
		private readonly message: IChatMessage,

		/** Author of this message. */
		public readonly author: Observable<string>,

		/** Author User object, if available. */
		public readonly authorUser?: User
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

			if (!this.value || !this.message.value) {
				return;
			}

			if (this.value.calendarInvite) {
				this.message.value.calendarInvite	= undefined;
				this.value.calendarInvite			= undefined;
			}
			if (this.value.form) {
				this.message.value.form				= undefined;
				this.value.form						= undefined;
			}
			if (this.value.quill) {
				potassiumUtil.clearMemory(this.value.quill);
				this.value.quill					= undefined;
				this.message.value.quill			= undefined;

			}
			if (this.value.text) {
				this.message.value.text				= '';
				this.value.text						= '';
			}
		});
	}
}
