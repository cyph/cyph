import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {IAsyncSet} from '../iasync-set';
import {MaybePromise} from '../maybe-promise-type';
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
	private readonly _UNREAD_ITEMS		= resolvable<IAsyncSet<string>>();

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

	/** Resolves unreadItems. */
	public readonly resolveUnreadItems: (rootElement: MaybePromise<IAsyncSet<string>>) => void	=
		this._UNREAD_ITEMS.resolve
	;

	/** Unread item IDs. */
	public readonly unreadItems: Promise<IAsyncSet<string>>	= this._UNREAD_ITEMS.promise;

	/** @ignore */
	private async updateTitle () : Promise<void> {
		const unreadItemCount	= await (await this.unreadItems).size();

		if (!this.itemCountInTitle || unreadItemCount === this.lastUnreadItemCount) {
			return;
		}

		this.titleService.setTitle(
			(unreadItemCount > 0 ? `(${unreadItemCount.toString()}) ` : '') +
			this.titleService.getTitle().replace(/^\(\d+\) /, '')
		);

		this.lastUnreadItemCount	= unreadItemCount;
	}

	/** Initializes service. */
	public init (rootElement?: JQuery, itemCountInTitle: boolean = false) : void {
		this.itemCountInTitle	= itemCountInTitle;
		this.resolveRootElement(rootElement);
	}

	/** Indicates whether item has been read. */
	public async isRead (id: string) : Promise<boolean> {
		return !(await (await this.unreadItems).hasItem(id));
	}

	/** Scrolls to bottom. */
	public async scrollDown () : Promise<void> {
		const rootElement	= await this.rootElement;
		if (!rootElement) {
			return;
		}

		await lockTryOnce(this.scrollDownLock, async () => {
			await (await this.unreadItems).clear();
			await this.updateTitle();

			await sleep();
			await rootElement.animate(
				{scrollTop: rootElement[0].scrollHeight},
				350
			).promise();
		});
	}

	/** Set item as read. */
	public async setRead (id: string) : Promise<void> {
		await (await this.unreadItems).deleteItem(id);
		await this.updateTitle();
	}

	/** Process new item. */
	public async trackItem (id: string) : Promise<void> {
		const rootElement	= await this.rootElement;
		if (!rootElement) {
			return;
		}

		const unreadItems		= await this.unreadItems;

		const scrollPosition	=
			rootElement[0].scrollHeight -
			(
				rootElement[0].scrollTop +
				rootElement[0].clientHeight
			)
		;

		if (
			this.windowWatcherService.visibility.value &&
			(await unreadItems.size()) < 1 &&
			scrollPosition < 150
		) {
			this.scrollDown();
			return;
		}

		await unreadItems.addItem(id);
		await this.updateTitle();
	}

	constructor (
		/** @ignore */
		private readonly titleService: Title,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {}
}
