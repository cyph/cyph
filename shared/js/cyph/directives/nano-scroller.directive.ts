import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Adds macOS-style scrollbars (generally intended for use
 * only when the scrollbar explicitly needs to be auto-hidden).
 */
@Directive({
	selector: '[cyphNanoScroller]'
})
export class NanoScrollerDirective implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.renderer.addClass(this.elementRef.nativeElement, 'nano');

		if (this.envService.isEdge) {
			this.renderer.addClass(this.elementRef.nativeElement, 'edge');
		}
		else if (!this.envService.isMobile && !this.envService.isMacOS) {
			this.renderer.addClass(this.elementRef.nativeElement, 'other');
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
