import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {Set as ImmutableSet} from 'immutable';
import {lockTryOnce} from '../util/lock';
import {resolvable, sleep} from '../util/wait';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Manages scrolling and scroll-detection.
 */
@Injectable()
export class ScrollService {
	/** @ignore */
	private readonly _ROOT_ELEMENT		= resolvable<JQuery|undefined>();

	/** @ignore */
	private itemCountInTitle: boolean	= false;

	/** @ignore */
	private lastUnreadItemCount: number	= 0;

	/** @ignore */
	private readonly resolveRootElement: (rootElement?: JQuery) => void	=
		this._ROOT_ELEMENT.resolve
	;

	/** @ignore */
	private readonly rootElement: Promise<JQuery|undefined>	= this._ROOT_ELEMENT.promise;

	/** @ignore */
	private readonly scrollDownLock: {}	= {};

	/** @ignore */
	private unreadItems: ImmutableSet<string>	= ImmutableSet<string>();

	/** @ignore */
	private updateTitle () : void {
		if (!this.itemCountInTitle || this.unreadItemCount === this.lastUnreadItemCount) {
			return;
		}

		this.titleService.setTitle(
			(this.unreadItemCount > 0 ? `(${this.unreadItemCount.toString()}) ` : '') +
			this.titleService.getTitle().replace(/^\(\d+\) /, '')
		);

		this.lastUnreadItemCount	= this.unreadItemCount;
	}

	/** Initializes service. */
	public init (rootElement?: JQuery, itemCountInTitle: boolean = false) : void {
		this.itemCountInTitle	= itemCountInTitle;
		this.resolveRootElement(rootElement);
	}

	/** Indicates whether item has been read. */
	public isRead (id: string) : boolean {
		return !this.unreadItems.has(id);
	}

	/** Scrolls to bottom. */
	public async scrollDown () : Promise<void> {
		const rootElement	= await this.rootElement;
		if (!rootElement) {
			return;
		}

		await lockTryOnce(this.scrollDownLock, async () => {
			this.unreadItems	= this.unreadItems.clear();
			this.updateTitle();

			await sleep();
			await rootElement.animate(
				{scrollTop: rootElement[0].scrollHeight},
				350
			).promise();
		});
	}

	/** Set item as read. */
	public async setRead (id: string) : Promise<void> {
		this.unreadItems	= this.unreadItems.delete(id);
		this.updateTitle();
	}

	/** Process new item. */
	public async trackItem (id: string) : Promise<void> {
		const rootElement	= await this.rootElement;
		if (!rootElement) {
			return;
		}

		const scrollPosition	=
			rootElement[0].scrollHeight -
			(
				rootElement[0].scrollTop +
				rootElement[0].clientHeight
			)
		;

		if (
			this.windowWatcherService.visibility.value &&
			this.unreadItemCount < 1 &&
			scrollPosition < 150
		) {
			this.scrollDown();
			return;
		}

		this.unreadItems	= this.unreadItems.add(id);
		this.updateTitle();
	}

	/** Number of items that haven't appeared in viewport. */
	public get unreadItemCount () : number {
		return this.unreadItems.size;
	}

	constructor (
		/** @ignore */
		private readonly titleService: Title,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {}
}
