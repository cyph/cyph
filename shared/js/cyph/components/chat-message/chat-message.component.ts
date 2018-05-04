import {
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	Output,
	Renderer2,
	SimpleChanges
} from '@angular/core';
import * as $ from 'jquery';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {ChatMessage, UiStyles} from '../../chat';
import {IQuillDelta} from '../../iquill-delta';
import {ChatService} from '../../services/chat.service';
import {DialogService} from '../../services/dialog.service';
import {ScrollService} from '../../services/scroll.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {sleep, waitForIterable} from '../../util/wait';


/**
 * Angular component for chat message.
 */
@Component({
	selector: 'cyph-chat-message',
	styleUrls: ['./chat-message.component.scss'],
	templateUrl: './chat-message.component.html'
})
export class ChatMessageComponent implements OnChanges, OnDestroy {
	/** Temporary workaround pending ACCOUNTS-36. */
	public static appeared: BehaviorSubject<Set<string>>	= (() => {
		const ids			= new Set<string>();
		const subject		= new BehaviorSubject(ids);

		(async () => {
			while (true) {
				await sleep(500);

				if (!ChatMessageComponent.visibilityWatcherService) {
					continue;
				}

				await ChatMessageComponent.visibilityWatcherService.waitUntilVisible();

				const idCount	= ids.size;
				const elements	= document.querySelectorAll(
					'cyph-chat-message > .message-item[id]'
				);

				for (const elem of Array.from(elements)) {
					const id	= (elem.id || '').split('message-id-')[1];
					if (!id || ids.has(id)) {
						continue;
					}

					const rootElement	=
						elem.parentElement &&
						elem.parentElement.parentElement &&
						elem.parentElement.parentElement.parentElement &&
						elem.parentElement.parentElement.parentElement.parentElement &&
						elem.parentElement.parentElement.parentElement.parentElement.parentElement
					;

					if (!rootElement) {
						continue;
					}

					const offset	= $(elem).offset();

					if (offset && offset.top > 0 && offset.top < rootElement.clientHeight) {
						ids.add(id);
					}
				}

				if (ids.size !== idCount) {
					subject.next(ids);
				}
			}
		})();

		return subject;
	})();

	/** Temporary workaround pending ACCOUNTS-36. */
	public static visibilityWatcherService?: {waitUntilVisible: () => Promise<void>};


	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes: typeof ChatMessage.AuthorTypes	= ChatMessage.AuthorTypes;

	/** @see ChatMessage */
	@Input() public message?: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean		= false;

	/** Indicates whether message is pending locally. */
	@Input() public pending: boolean	= false;

	/** @see ChatMessageValue.quill */
	public readonly quill: BehaviorSubject<IQuillDelta|undefined>	=
		new BehaviorSubject<IQuillDelta|undefined>(undefined)
	;

	/** If true, will scroll into view. */
	@Input() public scrollIntoView: boolean							= false;

	/** Fires after scrolling into view. */
	@Output() public readonly scrolledIntoView: EventEmitter<void>	= new EventEmitter<void>();

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
		if (!ChatMessageComponent.visibilityWatcherService) {
			ChatMessageComponent.visibilityWatcherService	= this.windowWatcherService;
		}

		if (!changes.message || this.message === undefined) {
			return;
		}

		const id	= this.message.id;

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

		if (this.scrollIntoView) {
			if (
				this.elementRef.nativeElement &&
				typeof this.elementRef.nativeElement.scrollIntoView === 'function' &&
				/* Leave email-style UI at the top for now */
				this.uiStyle !== UiStyles.email
			) {
				await this.waitUntilInitiated();
				this.elementRef.nativeElement.scrollIntoView(undefined, {behavior: 'instant'});
			}

			this.scrolledIntoView.emit();
		}

		if (
			this.unconfirmedMessages === undefined ||
			this.message !== changes.message.currentValue ||
			this.scrollService.isRead(this.message.id)
		) {
			return;
		}

		await this.windowWatcherService.waitUntilVisible();

		/* Temporary workaround pending ACCOUNTS-36 */
		await ChatMessageComponent.appeared.pipe(filter(arr => arr.has(id)), take(1)).toPromise();

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
			this.renderer.removeClass(element, 'transitionend');
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
		private readonly windowWatcherService: WindowWatcherService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
