import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Inject,
	Input,
	OnChanges,
	OnDestroy,
	Optional,
	Output,
	Renderer2,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {MatMenuTrigger} from '@angular/material/menu';
import * as Hammer from 'hammerjs';
import * as $ from 'jquery';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {ChatMessage, UiStyles} from '../../chat';
import {IQuillDelta} from '../../iquill-delta';
import {AccountService} from '../../services/account.service';
import {ChatService} from '../../services/chat.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {FileService} from '../../services/file.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {copyToClipboard} from '../../util/clipboard';
import {readableByteLength} from '../../util/formatting';
import {sleep, waitForIterable} from '../../util/wait';

/**
 * Angular component for chat message.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message',
	styleUrls: ['./chat-message.component.scss'],
	templateUrl: './chat-message.component.html'
})
export class ChatMessageComponent extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy {
	/** @ignore */
	private static readonly appeared: BehaviorSubject<Set<string>> = (() => {
		const ids = new Set<string>();
		const subject = new BehaviorSubject(ids);

		(async () => {
			while (true) {
				await sleep(500);

				if (!ChatMessageComponent.services) {
					continue;
				}

				await ChatMessageComponent.services.windowWatcherService.waitUntilVisible();

				if (
					ChatMessageComponent.services.p2pService.isActive.value &&
					!ChatMessageComponent.services.p2pService.isSidebarOpen
						.value
				) {
					continue;
				}

				const idCount = ids.size;
				const elements = document.querySelectorAll(
					'cyph-chat-message > .message-item[data-message-id]'
				);

				for (const elem of Array.from(elements)) {
					const id = elem.getAttribute('data-message-id');
					if (!id || ids.has(id)) {
						continue;
					}

					const rootElement =
						elem.parentElement &&
						elem.parentElement.parentElement &&
						elem.parentElement.parentElement.parentElement &&
						elem.parentElement.parentElement.parentElement
							.parentElement &&
						elem.parentElement.parentElement.parentElement
							.parentElement.parentElement;

					if (!rootElement) {
						continue;
					}

					const offset = $(elem).offset();

					if (
						offset &&
						offset.top > 0 &&
						offset.top < rootElement.clientHeight
					) {
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

	/** @ignore */
	private static services?: {
		p2pService: {
			isActive: BehaviorSubject<boolean>;
			isSidebarOpen: BehaviorSubject<boolean>;
		};
		windowWatcherService: {waitUntilVisible: () => Promise<void>};
	};

	/** @see ChatMessage.AuthorTypes */
	public readonly authorTypes = ChatMessage.AuthorTypes;

	/** Clipboard copy menu trigger. */
	@ViewChild(MatMenuTrigger, {static: false})
	public clipboardCopyMenuTrigger?: MatMenuTrigger;

	/** Fires after message is fully loaded. */
	@Output() public readonly loaded = new EventEmitter<void>();

	/** @see ChatMessage */
	@Input() public message?: ChatMessage;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean = false;

	/** Indicates whether message is pending locally. */
	@Input() public pending: boolean = false;

	/** @see ChatMessageValue.quill */
	public readonly quill: BehaviorSubject<
		IQuillDelta | undefined
	> = new BehaviorSubject<IQuillDelta | undefined>(undefined);

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** If true, will scroll into view. */
	@Input() public scrollIntoView: boolean = false;

	/** Fires after scrolling into view. */
	@Output() public readonly scrolledIntoView: EventEmitter<
		void
	> = new EventEmitter<void>();

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles = UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles = UiStyles;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages?: {[id: string]: boolean | undefined};

	/** Indicates whether view is ready. */
	public readonly viewReady: BehaviorSubject<boolean> = new BehaviorSubject<
		boolean
	>(false);

	/** Indicates whether message is confirmed. */
	public get confirmed () : boolean {
		return !!(
			this.message &&
			this.unconfirmedMessages &&
			(this.message.authorType !== ChatMessage.AuthorTypes.Local ||
				!(this.message.id in this.unconfirmedMessages))
		);
	}

	/** Copies message content to clipboard. */
	public async copyToClipboard (quote: boolean = false) : Promise<void> {
		if (!(this.message && this.message.value && this.message.value.text)) {
			return;
		}

		await copyToClipboard(
			quote ?
				this.message.value.text.replace(/(^|\n)(.)/g, '$1> $2') :
				this.message.value.text,
			this.stringsService.messageCopied,
			this.stringsService.clipboardCopyFail
		);
	}

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		const clipboardCopyMenuTrigger = this.clipboardCopyMenuTrigger;

		if (
			!this.envService.isMobileOS ||
			!clipboardCopyMenuTrigger ||
			!this.elementRef.nativeElement
		) {
			return;
		}

		new Hammer(this.elementRef.nativeElement, {
			recognizers: [[Hammer.Press, {time: 500}]]
		}).on('press', () => {
			clipboardCopyMenuTrigger.openMenu();
		});
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (!ChatMessageComponent.services) {
			ChatMessageComponent.services = {
				p2pService: this.p2pService,
				windowWatcherService: this.windowWatcherService
			};
		}

		if (!changes.message || this.message === undefined) {
			return;
		}

		const id = this.message.id;

		await this.chatService.getMessageValue(this.message);

		this.quill.next(
			this.message.value &&
				this.message.value.quill &&
				this.message.value.quill.length > 0 ?
				msgpack.decode(this.message.value.quill) :
				undefined
		);

		/* Run it here when it won't be triggered by an event handler in the template. */
		if (
			this.message.value &&
			!(this.message.value.quill && this.message.value.quill.length > 0)
		) {
			this.resolveViewReady();
		}

		if (this.scrollIntoView) {
			if (
				this.elementRef.nativeElement &&
				typeof this.elementRef.nativeElement.scrollIntoView ===
					'function' &&
				/* Leave email-style UI at the top for now */
				this.uiStyle !== UiStyles.mail
			) {
				await this.waitUntilInitiated();
				this.elementRef.nativeElement.scrollIntoView(undefined, {
					behavior: 'instant'
				});
			}

			this.scrolledIntoView.emit();
		}

		if (
			this.unconfirmedMessages === undefined ||
			this.message !== changes.message.currentValue ||
			(await this.scrollService.isRead(this.message.id))
		) {
			return;
		}

		await this.windowWatcherService.waitUntilVisible();

		await ChatMessageComponent.appeared
			.pipe(
				filter(arr => arr.has(id)),
				take(1)
			)
			.toPromise();

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

	/** Resolves after view init. */
	public async waitUntilInitiated () : Promise<void> {
		await this.viewReady
			.pipe(
				filter(b => b),
				take(1)
			)
			.toPromise();

		const $elem = $(this.elementRef.nativeElement);
		const $message = await waitForIterable(() => $elem.find('.message'));

		await Promise.all(
			$message
				.children()
				.toArray()
				.map(async element => {
					const promise = new Promise<void>(resolve => {
						$(element).one('transitionend', () => {
							resolve();
						});
					});

					this.renderer.addClass(element, 'transitionend');
					await Promise.race([promise, sleep(3000)]);
					this.renderer.removeClass(element, 'transitionend');
				})
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly p2pService: P2PService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see AccountService */
		@Optional()
		@Inject(AccountService)
		public readonly accountService: AccountService | undefined,

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
