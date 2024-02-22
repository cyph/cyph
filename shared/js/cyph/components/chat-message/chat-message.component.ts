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
	OnInit,
	Optional,
	Output,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {MatLegacyMenuTrigger as MatMenuTrigger} from '@angular/material/legacy-menu';
import Hammer from 'hammerjs';
import $ from 'jquery';
import {BehaviorSubject, firstValueFrom} from 'rxjs';
import {filter} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {ChatMessage, UiStyles} from '../../chat';
import {IQuillDelta} from '../../iquill-delta';
import {ListHoleError} from '../../list-hole-error';
import {IChatMessage} from '../../proto';
import {AccountService} from '../../services/account.service';
import {ChatService} from '../../services/chat.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {FileService} from '../../services/file.service';
import {P2PService} from '../../services/p2p.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {copyToClipboard} from '../../util/clipboard';
import {readableByteLength} from '../../util/formatting';
import {dynamicDeserialize} from '../../util/serialization';
import {sleep} from '../../util/wait';

/**
 * Angular component for chat message.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-message',
	styleUrls: ['./chat-message.component.scss'],
	templateUrl: './chat-message.component.html'
})
export class ChatMessageComponent
	extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy, OnInit
{
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
						elem.parentElement?.parentElement?.parentElement
							?.parentElement?.parentElement;

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
	private static readonly mediaSpoilerReveals = new Set<string>();

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

	/** @see ChatMessageComponent.message */
	public readonly chatMessage = new BehaviorSubject<ChatMessage | undefined>(
		undefined
	);

	/** Clipboard copy menu trigger. */
	@ViewChild('clipboardCopyMenuTrigger', {read: MatMenuTrigger})
	public clipboardCopyMenuTrigger?: MatMenuTrigger;

	/** Fires after message is fully loaded. */
	@Output() public readonly loaded = new EventEmitter<void>();

	/** Indicates whether media "spoiler" mode should be active. */
	public readonly mediaSpoiler: BehaviorSubject<boolean> =
		new BehaviorSubject<boolean>(true);

	/** @see ChatMessage */
	@Input() public message?: IChatMessage | string | ListHoleError;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean = false;

	/** Indicates whether message is pending locally. */
	public pending: boolean = false;

	/** @see ChatMessageValue.quill */
	public readonly quill: BehaviorSubject<IQuillDelta | undefined> =
		new BehaviorSubject<IQuillDelta | undefined>(undefined);

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** If true, will scroll into view. */
	@Input() public scrollIntoView: boolean = false;

	/** Fires after scrolling into view. */
	@Output() public readonly scrolledIntoView: EventEmitter<void> =
		new EventEmitter<void>();

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see ChatMainComponent.uiStyle */
	@Input() public uiStyle: UiStyles = UiStyles.default;

	/** @see UiStyles */
	public readonly uiStyles = UiStyles;

	/** @see IChatData.unconfirmedMessages */
	@Input() public unconfirmedMessages?: {[id: string]: boolean | undefined};

	/** Indicates whether view is ready. */
	public readonly viewReady: BehaviorSubject<boolean> =
		new BehaviorSubject<boolean>(false);

	/** Indicates whether message is confirmed. */
	public get confirmed () : boolean {
		return !!(
			this.message instanceof ChatMessage &&
			this.unconfirmedMessages &&
			(this.message.authorType !== ChatMessage.AuthorTypes.Local ||
				!(this.message.id in this.unconfirmedMessages))
		);
	}

	/** Copies message content to clipboard. */
	public async copyToClipboard (quote: boolean = false) : Promise<void> {
		if (
			!(
				this.message instanceof ChatMessage &&
				this.message.value &&
				this.message.value.text
			)
		) {
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

	/** @see ChatMessage.hidden */
	public get hidden () : boolean {
		return this.message instanceof ChatMessage && this.message.hidden;
	}

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.envService.isMobileOS || !this.elementRef.nativeElement) {
			return;
		}

		new Hammer(this.elementRef.nativeElement, {
			recognizers: [[Hammer.Press, {time: 500}]]
		}).on('press', () => {
			if (this.clipboardCopyMenuTrigger) {
				this.clipboardCopyMenuTrigger.openMenu();
			}
		});
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		await this.updateState(changes);
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		this.viewReady.next(false);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.updateState();
	}

	/** Resolves viewReady. */
	public resolveViewReady () : void {
		this.viewReady.next(true);
	}

	/** Updates component state. */
	/* eslint-disable-next-line complexity */
	public async updateState (changes?: SimpleChanges) : Promise<void> {
		if (!ChatMessageComponent.services) {
			ChatMessageComponent.services = {
				p2pService: this.p2pService,
				windowWatcherService: this.windowWatcherService
			};
		}

		if ((changes && !changes.message) || this.message === undefined) {
			if (this.message === undefined) {
				this.chatMessage.next(undefined);
			}

			return;
		}

		const baseMessage = this.message;
		this.message = undefined;

		const metadata = await this.chatService.getMessageMetadata(baseMessage);

		this.chatMessage.next(metadata.message);

		const initiatedPromise = this.waitUntilInitiated();

		this.message = metadata.message;
		this.pending = metadata.pending;

		if (!(this.message instanceof ChatMessage) || this.message.hidden) {
			return;
		}

		const id = this.message.id;

		this.mediaSpoiler.next(
			!ChatMessageComponent.mediaSpoilerReveals.has(id)
		);
		if (this.mediaSpoiler.value) {
			firstValueFrom(this.mediaSpoiler.pipe(filter(b => !b))).then(() => {
				if (!(this.message instanceof ChatMessage)) {
					return;
				}

				ChatMessageComponent.mediaSpoilerReveals.add(id);
			});
		}

		await this.chatService.getMessageValue(this.message);

		this.quill.next(
			this.message.value?.quill && this.message.value.quill.length > 0 ?
				dynamicDeserialize(this.message.value.quill) :
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
				await initiatedPromise;
				this.elementRef.nativeElement.scrollIntoView(undefined, {
					behavior: 'instant'
				});
			}

			this.scrolledIntoView.emit();
		}

		if (
			this.message.value?.fileTransfer?.media &&
			this.message.value?.fileTransfer?.size <=
				this.fileService.mediaSizeLimit
		) {
			await this.fileTransferService.getMedia(
				this.message.value.fileTransfer
			);
		}

		await initiatedPromise;
		this.chatService.markMessageLoadComplete(id);

		if (
			this.unconfirmedMessages === undefined ||
			id !==
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				(typeof this.message === 'string' ?
					this.message :
					this.message?.id) ||
			(await this.scrollService.isRead(id))
		) {
			return;
		}

		await this.windowWatcherService.waitUntilVisible();

		await firstValueFrom(
			ChatMessageComponent.appeared.pipe(filter(arr => arr.has(id)))
		);

		if (
			id ===
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			(typeof this.message === 'string' ? this.message : this.message?.id)
		) {
			await this.scrollService.setRead(id);
		}
	}

	/** Resolves after view init. */
	public async waitUntilInitiated () : Promise<void> {
		await Promise.all([
			firstValueFrom(this.loaded),
			firstValueFrom(this.viewReady.pipe(filter(b => b)))
		]);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

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

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
