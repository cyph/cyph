import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {Set as ImmutableSet} from 'immutable';
import * as $ from 'jquery';
import {lockTryOnce} from '../util/lock';
import {sleep} from '../util/wait';
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
	private readonly rootElement: Promise<JQuery>	= new Promise<JQuery>(resolve => {
		this.resolveRootElement	= resolve;
	});

	/** @ignore */
	private readonly scrollDownLock: {}	= {};

	/** @ignore */
	private unreadItems: ImmutableSet<JQuery>	= ImmutableSet<JQuery>();

	/** @ignore */
	private async appeared ($elem: JQuery) : Promise<boolean> {
		await this.visibilityWatcherService.waitUntilVisible();

		const offset	= $elem.offset();
		return offset.top > 0 && offset.top < (await this.rootElement).height();
	}

	/** @ignore */
	private updateTitle ($elem?: JQuery) : void {
		if ($elem) {
			this.unreadItems	= this.unreadItems.add($elem);
		}

		if (!this.itemCountInTitle) {
			return;
		}

		this.titleService.setTitle(
			(this.unreadItemCount > 0 ? `(${this.unreadItemCount.toString()}) ` : '') +
			this.titleService.getTitle().replace(/^\(\d+\) /, '')
		);
	}

	/** Initializes service. */
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

	/** Process read-ness and scrolling. */
	public async trackItem ($elem: JQuery) : Promise<void> {
		const rootElement	= await this.rootElement;

		if (!this.visibilityWatcherService.isVisible) {
			this.updateTitle($elem);
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

		this.updateTitle($elem);
		while (!(await this.appeared($elem))) {
			if (!this.unreadItems.has($elem)) {
				return;
			}

			await sleep();
		}

		this.unreadItems	= this.unreadItems.delete($elem);
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
