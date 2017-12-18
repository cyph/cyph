import {
	Component,
	ElementRef,
	Input,
	OnChanges,
	OnDestroy,
	Renderer2,
	SimpleChanges
} from '@angular/core';
import * as $ from 'jquery';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {filter} from 'rxjs/operators/filter';
import {take} from 'rxjs/operators/take';
import {ChatMessage, UiStyles} from '../chat';
import {IQuillDelta} from '../iquill-delta';
import {ChatService} from '../services/chat.service';
import {DialogService} from '../services/dialog.service';
import {ScrollService} from '../services/scroll.service';
import {StringsService} from '../services/strings.service';
import {VisibilityWatcherService} from '../services/visibility-watcher.service';
import {waitForIterable} from '../util/wait';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['../../../css/components/chat-message.scss'],
	templateUrl: '../../../templates/chat-message.html'
})
export class ChatMessageComponent implements OnChanges, OnDestroy {
	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes: typeof ChatMessage.AuthorTypes	= ChatMessage.AuthorTypes;

	/** @see ChatMessage */
	@Input() public message?: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean		= false;

	/** @see ChatMessageValue.quill */
	public readonly quill: BehaviorSubject<IQuillDelta|undefined>	=
		new BehaviorSubject(undefined)
	;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles			= UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles	= UiStyles;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages?: {[id: string]: boolean|undefined};

	/** Indicates whether view is ready. */
	public readonly viewReady: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Handle clicks to display image dialogs when needed. */
	public click (event: MouseEvent) : void {
		if (event.target instanceof HTMLImageElement) {
			this.dialogService.image(event.target.src);
		}
	}

	/** Indicates whether message is confirmed. */
	public get confirmed () : boolean {
		return (
			this.message === undefined ||
			this.unconfirmedMessages === undefined ||
			this.message.authorType !== ChatMessage.AuthorTypes.Local ||
			!(this.message.id && this.unconfirmedMessages[this.message.id])
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
			this.scrollService.isRead(this.message.id)
		) {
			return;
		}

		await this.visibilityWatcherService.waitUntilVisible();

		if (this.message === changes.message.currentValue) {
			this.scrollService.setRead(this.message.id);
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.viewReady.next(false);
	}

	/** Resolves viewReady. */
	public resolveViewReady () : void {
		this.viewReady.next(true);
	}

	/** Resolves after view init. */
	public async waitUntilInitiated () : Promise<void> {
		await this.viewReady.pipe(filter(b => b), take(1)).toPromise();

		const $elem		= $(this.elementRef.nativeElement);
		const $message	= await waitForIterable(() => $elem.find('.message'));

		await Promise.all($message.children().toArray().map(async element => {
			const promise	= new Promise<void>(async resolve => {
				$(element).one('transitionend', () => { resolve(); });
			});

			this.renderer.addClass(element, 'transitionend');

			await promise;
		}));
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly visibilityWatcherService: VisibilityWatcherService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
