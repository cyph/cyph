import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import * as $ from 'jquery';
import {util} from '../util';
import {EnvService} from './env.service';
import {VisibilityWatcherService} from './visibility-watcher.service';


/**
 * Manages scrolling and scroll-detection.
 */
@Injectable()
export class ScrollService {
	/** @ignore */
	private itemCountInTitle: boolean	= false;

	/** @ignore */
	private rootElement?: JQuery;

	/** @ignore */
	private scrollDownLock: {}	= {};

	/** @ignore */
	private unreadItems: Set<{unread: boolean}>	= new Set<{unread: boolean}>();

	/** @ignore */
	private appeared ($elem: JQuery) : boolean {
		if (!this.rootElement) {
			return false;
		}

		const offset	= $elem.offset();
		return offset.top > 0 && offset.top < this.rootElement.height();
	}

	/** @ignore */
	private updateTitle (item?: {unread: boolean}) : void {
		if (item && item.unread) {
			this.unreadItems.add(item);
		}

		if (!this.itemCountInTitle) {
			return;
		}

		this.titleService.setTitle(
			(this.unreadItemCount > 0 ? `(${this.unreadItemCount.toString()}) ` : '') +
			this.titleService.getTitle().replace(/^\(\d+\) /, '')
		);
	}

	/** Initialise service. */
	public init (rootElement: JQuery, itemCountInTitle: boolean = false) : void {
		this.rootElement		= rootElement;
		this.itemCountInTitle	= itemCountInTitle;

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Workaround for jQuery appear plugin */
		const $window	= $(window);
		this.rootElement.scroll(() => $window.trigger('scroll'));
	}

	/** Scrolls to bottom. */
	public async scrollDown () : Promise<void> {
		return util.lockTryOnce(this.scrollDownLock, async () => {
			while (!this.rootElement) {
				await util.sleep();
			}

			await util.sleep();

			await this.rootElement.animate(
				{scrollTop: this.rootElement[0].scrollHeight},
				350
			).promise();

			for (const item of Array.from(this.unreadItems)) {
				item.unread	= false;
			}
			this.unreadItems.clear();
			this.updateTitle();
		});
	}

	/** Process read-ness and scrolling. */
	public async trackItem (item: {unread: boolean}, $elem: JQuery) : Promise<void> {
		while (!this.rootElement) {
			await util.sleep();
		}

		if (!this.visibilityWatcherService.isVisible) {
			this.updateTitle(item);
			await this.visibilityWatcherService.waitForChange();
		}

		const scrollPosition	=
			this.rootElement[0].scrollHeight -
			(
				this.rootElement[0].scrollTop +
				this.rootElement[0].clientHeight
			)
		;

		if (($elem.height() + 150) > scrollPosition) {
			this.scrollDown();
			return;
		}

		this.updateTitle(item);
		while (!this.appeared($elem)) {
			await util.sleep();
		}

		item.unread	= false;
		this.unreadItems.delete(item);
		this.updateTitle();
	}

	/** Number of items that haven't appeared in viewport. */
	public get unreadItemCount () : number {
		return this.unreadItems.size;
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly titleService: Title,

		/** @ignore */
		private readonly visibilityWatcherService: VisibilityWatcherService
	) {}
}
