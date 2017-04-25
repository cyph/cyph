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
	private resolveRootElement: (rootElement: JQuery) => void;

	/** @ignore */
	private readonly rootElement: Promise<JQuery>	=
		/* tslint:disable-next-line:promise-must-complete */
		new Promise<JQuery>(resolve => {
			this.resolveRootElement	= resolve;
		})
	;

	/** @ignore */
	private readonly scrollDownLock: {}	= {};

	/** @ignore */
	private readonly unreadItems: Set<{unread: boolean}>	= new Set<{unread: boolean}>();

	/** @ignore */
	private async appeared ($elem: JQuery) : Promise<boolean> {
		const offset	= $elem.offset();
		return offset.top > 0 && offset.top < (await this.rootElement).height();
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
		this.itemCountInTitle	= itemCountInTitle;
		this.resolveRootElement(rootElement);

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Workaround for jQuery appear plugin */
		const $window	= $(window);
		rootElement.scroll(() => $window.trigger('scroll'));
	}

	/** Scrolls to bottom. */
	public async scrollDown () : Promise<void> {
		const rootElement	= await this.rootElement;

		await util.lockTryOnce(this.scrollDownLock, async () => {
			await util.sleep();

			await rootElement.animate(
				{scrollTop: rootElement[0].scrollHeight},
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
		const rootElement	= await this.rootElement;

		if (!this.visibilityWatcherService.isVisible) {
			this.updateTitle(item);
			await this.visibilityWatcherService.waitForChange();
		}

		const scrollPosition	=
			rootElement[0].scrollHeight -
			(
				rootElement[0].scrollTop +
				rootElement[0].clientHeight
			)
		;

		if (($elem.height() + 150) > scrollPosition) {
			this.scrollDown();
			return;
		}

		this.updateTitle(item);
		while (!(await this.appeared($elem))) {
			if (!item.unread) {
				return;
			}

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
