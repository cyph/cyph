import {Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../cyph/services/env.service';
import {util} from '../cyph/util';
import {DemoService} from './demo.service';
import {elements} from './elements';


/**
 * Angular component for the Cyph chat demo.
 */
@Component({
	selector: 'cyph-demo',
	styleUrls: ['../../css/components/cyph.com/demo.scss'],
	templateUrl: '../../templates/cyph.com/demo.html'
})
export class DemoComponent implements OnInit {
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
				const rootOffset	= o.$root.offset();
				const offset		= o.$screenshot.offset();
				const width			= o.$screenshot.width();
				const height		= o.$screenshot.height();

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
			await util.sleep();
		}

		this.demoService.isActive	= isActive;
	}

	/** @ignore */
	private async facebookJoke ($desktopPic: JQuery, $mobilePic: JQuery) : Promise<void> {
		const picUrl	= await this.demoService.facebookPicDataUri;

		const $picImg	= await util.waitForIterable(
			() => elements.demoRoot().find(`img:visible[src='${picUrl}']`),
			2
		);

		$picImg.each((_: number, elem: HTMLElement) => { (async () => {
			const $this: JQuery		= $(elem);

			const isMobile: boolean	=
				$this.parentsUntil().index(elements.demoListDesktop()[0]) < 0
			;

			const $pic: JQuery		= isMobile ? $mobilePic : $desktopPic;

			const $placeholder: JQuery	= $(
				this.demoService.facebookPicPlaceholder
			);

			$this.parent().replaceWith($placeholder);

			await util.sleep();

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
		const elemOffset		= elem.offset();
		const ancestorOffset	= ancestor.offset();

		return {
			left: Math.floor(elemOffset.left - ancestorOffset.left),
			top: Math.floor(elemOffset.top - ancestorOffset.top) - 5
		};
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const $window	= $(window);

		await util.waitForIterable(elements.demoRoot);
		await util.waitForIterable(elements.heroText);

		if (!this.envService.isMobile) {
			await util.waitForIterable(() =>
				elements.screenshotLaptop().filter((_: number, elem: HTMLElement) =>
					$(elem).offset().left > 0
				)
			);
			await util.waitForIterable(() =>
				elements.screenshotPhone().filter((_: number, elem: HTMLElement) =>
					$(elem).offset().left < $window.width()
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

		await util.sleep(750);

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
			$window.resize(async () => {
				const width	= $window.width();
				if (width === previousWidth) {
					return;
				}
				previousWidth	= width;
				this.activeTransition(false);
				await util.sleep(1000);
				this.activeTransition();
			});
		}

		const $desktopFacebookPic: JQuery	= $(this.demoService.facebookPicFrame);
		const $mobileFacebookPic: JQuery	= $(this.demoService.facebookPicFrame);

		this.demoService.run(() => {
			this.facebookJoke($desktopFacebookPic, $mobileFacebookPic);
		});

		if (!this.envService.isMobile) {
			await util.waitForIterable(elements.demoListDesktop);
			await util.waitForIterable(elements.demoListMobile);
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
