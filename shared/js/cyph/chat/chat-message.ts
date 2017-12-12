import * as msgpack from 'msgpack-lite';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IChatMessage} from '../chat';
import {ChatMessage as ChatMessageInternal, IChatMessageLine} from '../proto';
import {Timer} from '../timer';
import {getTimeString} from '../util/time';
import {sleep} from '../util/wait';
import {IChatMessageValue} from './ichat-message-value';


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
	public dimensions?: IChatMessageLine[]				= this.message.dimensions;

	/** @inheritDoc */
	public id: string					= this.message.id;

	/** @inheritDoc */
	public selfDestructTimeout?: number	= this.message.selfDestructTimeout;

	/** @inheritDoc */
	public readonly selfDestructTimer?: Timer;

	/** @inheritDoc */
	public timestamp: number			= this.message.timestamp;

	/** @inheritDoc */
	public readonly timeString: string	= getTimeString(this.message.timestamp);

	/** @ignore */
	public value?: IChatMessageValue	= this.message.value && {
		form: this.message.value.form,
		quillDelta: this.message.value.quillDelta || (
			this.message.value.quillDeltaBytes ?
				msgpack.decode(this.message.value.quillDeltaBytes) :
				undefined
			)
		,
		quillDeltaBytes: this.message.value.quillDeltaBytes,
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

			if (!this.value || !this.message.value) {
				return;
			}

			if (this.value.form) {
				this.message.value.form				= undefined;
				this.value.form						= undefined;
			}
			if (this.value.quillDeltaBytes) {
				potassiumUtil.clearMemory(this.value.quillDeltaBytes);
				this.value.quillDelta				= undefined;
				this.value.quillDeltaBytes			= undefined;
				this.message.value.quillDeltaBytes	= undefined;

			}
			if (this.value.text) {
				this.message.value.text				= '';
				this.value.text						= '';
			}
		});
	}
}
