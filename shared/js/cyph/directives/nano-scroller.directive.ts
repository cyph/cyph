import {Directive, ElementRef, Input, OnInit, Renderer2} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Adds macOS-style scrollbars (generally intended for use
 * only when the scrollbar explicitly needs to be auto-hidden).
 */
@Directive({
	selector: '[cyphNanoScroller]'
})
export class NanoScrollerDirective implements OnInit {
	/** If true, sets nano class on this element. */
	@Input() public cyphNanoScrollerNoParent: boolean	= false;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const element	= this.cyphNanoScrollerNoParent ?
			this.elementRef.nativeElement :
			this.renderer.parentNode(this.elementRef.nativeElement)
		;

		this.renderer.addClass(element, 'nano');

		if (this.envService.isEdge) {
			this.renderer.addClass(element, 'edge');
		}
		else if (!this.envService.isMobile && !this.envService.isMacOS) {
			this.renderer.addClass(element, 'other');
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
