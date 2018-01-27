import {AfterViewInit, Component} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../../../cyph/services/env.service';
import {sleep, waitForIterable} from '../../../cyph/util/wait';
import {DemoService} from '../../demo.service';
import {elements} from '../../elements';


/**
 * Angular component for the Cyph chat demo.
 */
@Component({
	selector: 'cyph-demo',
	styleUrls: ['./demo.component.scss'],
	templateUrl: './demo.component.html'
})
export class DemoComponent implements AfterViewInit {
	/** @ignore */
	private readonly mobileUIScale: number	= 0.625;

	/** @ignore */
	private async activeTransition (forceActiveState?: boolean) : Promise<void> {
		const isActive: boolean	=
			forceActiveState !== undefined ?
				forceActiveState :
				(!elements.heroText().is(':appeared') && elements.demoRoot().is(':appeared'))
		;

		if (this.demoService.isActive === isActive) {
			return;
		}

		if (isActive) {
			for (const o of [
				{
					$root: elements.demoRootDesktop(),
					$screenshot: elements.screenshotLaptop(),
					multiplierHeight: 0.104,
					multiplierWidth: 0.13,
					scale: 0.73,
					verticalOffset: 0
				},
				{
					$root: elements.demoRootMobile(),
					$screenshot: elements.screenshotPhone(),
					multiplierHeight: 0.098,
					multiplierWidth: 0.081,
					scale: 0.5,
					verticalOffset: 100
				}
			]) {
				const rootOffset	= o.$root.offset() || {left: 0, top: 0};
				const offset		= o.$screenshot.offset() || {left: 0, top: 0};
				const width			= o.$screenshot.width() || 0;
				const height		= o.$screenshot.height() || 0;

				o.$screenshot.css(
					'transform',
					`scale(${1 / o.scale}) ` +
					`translateX(${Math.ceil(
						(rootOffset.left * o.scale) -
						(offset.left * o.scale) -
						(width * o.multiplierWidth) +
						1
					)}px) ` +
					`translateY(${Math.ceil(
						(rootOffset.top * o.scale) -
						(offset.top * o.scale) -
						(height * o.multiplierHeight) +
						(o.verticalOffset * o.scale) +
						1
					)}px)`
				);
			}
		}
		else {
			elements.screenshotLaptop().add(elements.screenshotPhone()).removeAttr('style');
			await sleep();
		}

		this.demoService.isActive	= isActive;
	}

	/** @ignore */
	private async facebookJoke ($desktopPic: JQuery, $mobilePic: JQuery) : Promise<void> {
		const picUrl	= await this.demoService.facebookPicDataUri;

		const $picImg	= await waitForIterable(
			() => elements.demoRoot().find(`img:visible[src='${picUrl}']`),
			2
		);

		$picImg.each((_, elem) => { (async () => {
			const $this: JQuery		= $(elem);

			const isMobile: boolean	=
				$this.parentsUntil().index(elements.demoListDesktop()[0]) < 0
			;

			const $pic: JQuery		= isMobile ? $mobilePic : $desktopPic;

			const $placeholder: JQuery	= $(
				this.demoService.facebookPicPlaceholder
			);

			$this.parent().replaceWith($placeholder);

			await sleep();

			const offset	= this.getOffset(
				$placeholder,
				isMobile ?
					elements.demoListMobile() :
					elements.demoListDesktop()
			);

			if (isMobile) {
				offset.left	= Math.ceil(offset.left / this.mobileUIScale);
				offset.top	= Math.ceil(offset.top / this.mobileUIScale);
			}

			$pic.css(offset);
		})(); });

		this.demoService.desktop.scrollDown.next();
		this.demoService.mobile.scrollDown.next();
	}

	/** @ignore */
	private getOffset (elem: JQuery, ancestor: JQuery) : {left: number; top: number} {
		const elemOffset		= elem.offset() || {left: 0, top: 0};
		const ancestorOffset	= ancestor.offset() || {left: 0, top: 0};

		return {
			left: Math.floor(elemOffset.left - ancestorOffset.left),
			top: Math.floor(elemOffset.top - ancestorOffset.top) - 5
		};
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		const $window	= $(window);

		await waitForIterable(elements.demoRoot);
		await waitForIterable(elements.heroText);

		if (!this.envService.isMobile) {
			await waitForIterable(() =>
				elements.screenshotLaptop().filter((_, elem) =>
					($(elem).offset() || {left: 0, top: 0}).left > 0
				)
			);
			await waitForIterable(() =>
				elements.screenshotPhone().filter((_, elem) =>
					($(elem).offset() || {left: 0, top: 0}).left < ($window.width() || 0)
				)
			);
		}

		(<any> elements.demoRoot()).appear();
		(<any> elements.heroText()).appear();

		if (!elements.demoRoot().is(':appeared')) {
			await new Promise<void>(resolve => {
				elements.demoRoot().one('appear', () => { resolve(); });
			});
		}

		if (elements.heroText().is(':appeared')) {
			await new Promise<void>(resolve => {
				elements.heroText().one('disappear', () => { resolve(); });
			});
		}

		await sleep(750);

		if (!this.envService.isMobile) {
			await this.activeTransition(true);
		}

		elements.demoRoot().css('opacity', 1);

		if (!this.envService.isMobile) {
			elements.heroText().on('appear', () => { this.activeTransition(); });
			elements.heroText().on('disappear', () => { this.activeTransition(); });
			elements.demoRoot().on('appear', () => { this.activeTransition(); });
			elements.demoRoot().on('disappear', () => { this.activeTransition(); });

			let previousWidth	= $window.width();
			$window.on('resize', async () => {
				const width	= $window.width();
				if (width === previousWidth) {
					return;
				}
				previousWidth	= width;
				this.activeTransition(false);
				await sleep(1000);
				this.activeTransition();
			});
		}

		const $desktopFacebookPic: JQuery	= $(this.demoService.facebookPicFrame);
		const $mobileFacebookPic: JQuery	= $(this.demoService.facebookPicFrame);

		this.demoService.run(() => {
			this.facebookJoke($desktopFacebookPic, $mobileFacebookPic);
		});

		if (!this.envService.isMobile) {
			await waitForIterable(elements.demoListDesktop);
			await waitForIterable(elements.demoListMobile);
			elements.demoListDesktop().append($desktopFacebookPic);
			elements.demoListMobile().append($mobileFacebookPic);
		}
	}

	constructor (
		/** @see DemoService */
		public readonly demoService: DemoService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
