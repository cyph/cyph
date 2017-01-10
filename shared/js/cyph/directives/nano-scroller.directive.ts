import {Directive, ElementRef, OnDestroy, OnInit} from '@angular/core';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Adds macOS-style scrollbars (generally intended for use
 * only when the scrollbar explicitly needs to be auto-hidden).
 */
@Directive({
	selector: '[cyphNanoScroller]'
})
export class NanoScrollerDirective implements OnDestroy, OnInit {
	/** @ignore */
	private isAlive: boolean	= true;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.isAlive	= false;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			return;
		}

		const $elem		= $(this.elementRef.nativeElement);
		const $parent	= $elem.parent();

		$parent.addClass('nano');
		$elem.addClass('nano-content');

		if (this.envService.isMobile || this.envService.isMacOS) {
			return;
		}

		while (this.isAlive) {
			if ($elem.is(':visible')) {
				(<any> $parent).nanoScroller();
			}

			await util.sleep(1000);
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
