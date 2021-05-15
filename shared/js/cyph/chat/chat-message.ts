import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {UserLike} from '../account/user-like-type';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {MaybePromise} from '../maybe-promise-type';
import {
	ChatMessage as ChatMessageInternal,
	IChatMessage,
	IChatMessagePredecessor,
	IChatMessageValue
} from '../proto';
import {Timer} from '../timer';
import {getDateTimeString, getTimeString} from '../util/time';
import {sleep} from '../util/wait';

/** @inheritDoc */
export class ChatMessage implements IChatMessage {
	/** @see ChatMessageInternal.AuthorTypes */
	/* eslint-disable-next-line @typescript-eslint/naming-convention */
	public static readonly AuthorTypes = ChatMessageInternal.AuthorTypes;

	/** @inheritDoc */
	public authorID?: string = this.message.authorID;

	/** @inheritDoc */
	public authorType: ChatMessageInternal.AuthorTypes =
		this.message.authorType;

	/** Human-readable date + time. */
	public dateTimeString: string = getDateTimeString(this.message.timestamp);

	/** @inheritDoc */
	public hash?: Uint8Array = this.message.hash;

	/** @inheritDoc */
	public id: string = this.message.id;

	/** @inheritDoc */
	public key?: Uint8Array = this.message.key;

	/** @inheritDoc */
	public predecessors?: IChatMessagePredecessor[] = this.message.predecessors;

	/** @inheritDoc */
	public selfDestructTimeout?: number = this.message.selfDestructTimeout;

	/** @inheritDoc */
	public readonly selfDestructTimer?: Timer;

	/** @inheritDoc */
	public sessionSubID?: string = this.message.sessionSubID;

	/** @inheritDoc */
	public timestamp: number = this.message.timestamp;

	/** Human-readable time. */
	public timeString: string = getTimeString(this.message.timestamp);

	/** @ignore */
	public value?: IChatMessageValue & {failure?: boolean} = this.message
		.value && {
		calendarInvite: this.message.value.calendarInvite,
		fileTransfer: this.message.value.fileTransfer,
		form: this.message.value.form,
		quill: this.message.value.quill,
		text: this.message.value.text
	};

	/** Observable of value. */
	public readonly valueWatcher: Subject<
		(IChatMessageValue & {failure?: boolean}) | undefined
	> = new BehaviorSubject<
		(IChatMessageValue & {failure?: boolean}) | undefined
	>(this.value);

	/** Updates timestamp. */
	public updateTimestamp (timestamp: number) : void {
		this.message.timestamp = timestamp;
		this.timestamp = timestamp;
		this.dateTimeString = getDateTimeString(timestamp);
		this.timeString = getTimeString(this.message.timestamp);
	}

	constructor (
		/** @ignore */
		private readonly message: IChatMessage,

		/** Author of this message. */
		public readonly author: Observable<string>,

		/** Author UserLike object, if available. */
		public readonly authorUser?: MaybePromise<UserLike | undefined>,

		/** If true, hide this message. */
		public readonly hidden: boolean = false
	) {
		if (
			this.message.selfDestructTimeout === undefined ||
			isNaN(this.message.selfDestructTimeout) ||
			this.message.selfDestructTimeout < 1
		) {
			return;
		}

		this.selfDestructTimer = new Timer(this.message.selfDestructTimeout);

		this.selfDestructTimer.start().then(async () => {
			await sleep(10000);

			if (!this.value || !this.message.value) {
				return;
			}

			if (this.value.calendarInvite) {
				this.message.value.calendarInvite = undefined;
				this.value.calendarInvite = undefined;
			}
			if (this.value.fileTransfer) {
				this.message.value.fileTransfer = undefined;
				this.value.fileTransfer = undefined;
			}
			if (this.value.form) {
				this.message.value.form = undefined;
				this.value.form = undefined;
			}
			if (this.value.quill) {
				potassiumUtil.clearMemory(this.value.quill);
				this.value.quill = undefined;
				this.message.value.quill = undefined;
			}
			if (this.value.text) {
				this.message.value.text = '';
				this.value.text = '';
			}
		});
	}
}
