import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {IAsyncSet} from '../iasync-set';
import {MaybePromise} from '../maybe-promise-type';
import {toBehaviorSubject} from '../util/flatten-observable';
import {lockTryOnce} from '../util/lock';
import {resolvable, sleep} from '../util/wait';
import {WindowWatcherService} from './window-watcher.service';

/**
 * Manages scrolling and scroll-detection.
 */
@Injectable()
export class ScrollService extends BaseProvider {
	/** @ignore */
	private readonly _ROOT_ELEMENT = resolvable<JQuery | undefined>();

	/** @ignore */
	private readonly _UNREAD_ITEMS = resolvable<IAsyncSet<string>>();

	/** @ignore */
	private itemCountInTitle: boolean = false;

	/** @ignore */
	private lastUnreadItemCount: number = 0;

	/** @ignore */
	private readonly readItems: Set<string> = new Set();

	/** @ignore */
	private readonly resolveRootElement: (rootElement?: JQuery) => void =
		this._ROOT_ELEMENT.resolve;

	/** @ignore */
	private readonly rootElement: Promise<JQuery | undefined> =
		this._ROOT_ELEMENT;

	/** @ignore */
	private readonly scrollDownLock = {};

	/** Quick fix to make scrollDown behave sensibly with infinite scrolling. */
	public enableScrollDown: boolean = true;

	/** Scroll position deemed high enough that it makes sense to display unread indicator. */
	public readonly minScroll: number = 256;

	/** Resolves unreadItems. */
	public readonly resolveUnreadItems: (
		rootElement: MaybePromise<IAsyncSet<string>>
	) => void = this._UNREAD_ITEMS.resolve;

	/** Current scroll positon. */
	public readonly scrollPosition: BehaviorSubject<number> =
		toBehaviorSubject<number>(
			this.rootElement.then(rootElement =>
				rootElement ?
					new Observable<number>(observer => {
						const handler = () => {
							observer.next(
								Math.max(
									rootElement[0].scrollHeight -
										(rootElement[0].scrollTop +
											rootElement[0].clientHeight),
									0
								)
							);
						};

						rootElement.on('scroll', handler);

						return () => {
							rootElement.off('scroll', handler);
						};
					}) :
					0
			),
			this.minScroll,
			this.subscriptions
		);

	/** Unread item IDs. */
	public readonly unreadItems: Promise<IAsyncSet<string>> =
		this._UNREAD_ITEMS;

	/** Watches unread item count. */
	public readonly watchUnreadCount = memoize(() =>
		toBehaviorSubject<number>(
			async () => {
				const unreadItems = await this.unreadItems;

				return unreadItems.watch().pipe(
					map(
						ids =>
							Array.from(ids).filter(id => {
								if (!this.readItems.has(id)) {
									return true;
								}

								unreadItems.deleteItem(id);
								return false;
							}).length
					)
				);
			},
			0,
			this.subscriptions
		)
	);

	/** @ignore */
	private async updateTitle () : Promise<void> {
		const unreadItemCount = await (await this.unreadItems).size();

		if (
			!this.itemCountInTitle ||
			unreadItemCount === this.lastUnreadItemCount
		) {
			return;
		}

		this.titleService.setTitle(
			(unreadItemCount > 0 ? `(${unreadItemCount.toString()}) ` : '') +
				this.titleService.getTitle().replace(/^\(\d+\) /, '')
		);

		this.lastUnreadItemCount = unreadItemCount;
	}

	/** Initializes service. */
	public init (
		rootElement?: JQuery,
		itemCountInTitle: boolean = false
	) : void {
		this.itemCountInTitle = itemCountInTitle;
		this.resolveRootElement(rootElement);
	}

	/** Indicates whether item has been read. */
	public async isRead (id: string) : Promise<boolean> {
		const unreadItems = await this.unreadItems;
		const isReadRemotely = !(await unreadItems.hasItem(id));
		const isReadLocally = this.readItems.has(id);

		if (isReadLocally && !isReadRemotely) {
			unreadItems.deleteItem(id);
		}
		else if (!isReadLocally && isReadRemotely) {
			this.readItems.add(id);
		}

		return isReadLocally || isReadRemotely;
	}

	/** Scrolls to bottom. */
	public async scrollDown (
		force: boolean = true,
		delay: number = 0
	) : Promise<void> {
		if (!this.enableScrollDown) {
			return;
		}

		if (!(force || this.scrollPosition.value < this.minScroll)) {
			return;
		}

		if (delay > 0) {
			await sleep(delay);
		}

		const rootElement = await this.rootElement;
		if (!rootElement) {
			return;
		}

		await lockTryOnce(this.scrollDownLock, async () => {
			await (await this.unreadItems).clear();
			await this.updateTitle();

			await sleep();
			await rootElement
				.animate({scrollTop: rootElement[0].scrollHeight}, 350)
				.promise();
		});
	}

	/** Set item as read. */
	public async setRead (id: string) : Promise<void> {
		this.readItems.add(id);
		await (await this.unreadItems).deleteItem(id);
		await this.updateTitle();
	}

	/** Process new item. */
	public async trackItem (
		id: string,
		noScrollDown: boolean = false
	) : Promise<void> {
		const unreadItems = await this.unreadItems;

		if (
			!noScrollDown &&
			this.windowWatcherService.visibility.value &&
			(await unreadItems.size()) < 1 &&
			this.scrollPosition.value < this.minScroll
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
	) {
		super();

		this.subscriptions.push(
			this.scrollPosition.subscribe(async scrollPosition => {
				if (scrollPosition === 0) {
					await (await this.unreadItems).clear();
					await this.updateTitle();
				}
			})
		);
	}
}
