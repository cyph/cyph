import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	Output,
	SimpleChanges
} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {ChatMessage, UiStyles} from '../../chat';
import {IQuillDelta} from '../../iquill-delta';
import {ChatService} from '../../services/chat.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {FileService} from '../../services/file.service';
import {ScrollService} from '../../services/scroll.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {readableByteLength} from '../../util/formatting';


/**
 * Angular component for chat message.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message',
	styleUrls: ['./chat-message.component.scss'],
	templateUrl: './chat-message.component.html'
})
export class ChatMessageComponent extends BaseProvider implements OnChanges, OnDestroy {
	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes: typeof ChatMessage.AuthorTypes		= ChatMessage.AuthorTypes;

	/** @see ChatMessage */
	@Input() public message?: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean									= false;

	/** Indicates whether message is pending locally. */
	@Input() public pending: boolean								= false;

	/** @see ChatMessageValue.quill */
	public readonly quill: BehaviorSubject<IQuillDelta|undefined>	=
		new BehaviorSubject<IQuillDelta|undefined>(undefined)
	;

	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	/** Fires after scrolling into view. */
	@Output() public readonly scrolledIntoView: EventEmitter<void>	= new EventEmitter<void>();

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf					= trackBySelf;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles								= UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles						= UiStyles;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages?: {[id: string]: boolean|undefined};

	/** Indicates whether view is ready. */
	public readonly viewReady: BehaviorSubject<boolean>				= new BehaviorSubject(false);

	/** Indicates whether message is confirmed. */
	public get confirmed () : boolean {
		return !!(
			this.message &&
			this.unconfirmedMessages &&
			(
				this.message.authorType !== ChatMessage.AuthorTypes.Local ||
				!(this.message.id in this.unconfirmedMessages)
			)
		);
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (!changes.message || this.message === undefined) {
			return;
		}

		await this.chatService.getMessageValue(this.message);

		this.quill.next(
			this.message.value && this.message.value.quill && this.message.value.quill.length > 0 ?
				msgpack.decode(this.message.value.quill) :
				undefined
		);

		/* Run it here when it won't be triggered by an event handler in the template. */
		if (this.message.value && !(
			this.message.value.quill && this.message.value.quill.length > 0
		)) {
			this.resolveViewReady();
		}

		if (
			this.unconfirmedMessages === undefined ||
			this.message !== changes.message.currentValue ||
			(await this.scrollService.isRead(this.message.id))
		) {
			return;
		}

		await this.windowWatcherService.waitUntilVisible();

		if (this.message === changes.message.currentValue) {
			await this.scrollService.setRead(this.message.id);
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		this.viewReady.next(false);
	}

	/** Resolves viewReady. */
	public resolveViewReady () : void {
		this.viewReady.next(true);
	}

	constructor (
		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileService */
		public readonly fileService: FileService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
