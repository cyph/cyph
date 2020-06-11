import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {EnvService} from '../services/env.service';
import {openWindow} from '../util/window';

/**
 * Adds rel='noopener noreferrer' to all anchor elements.
 */
@Directive({
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	selector: 'a'
})
export class AnchorDirective extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		const elem = this.elementRef.nativeElement;

		if (!(elem instanceof HTMLAnchorElement)) {
			return;
		}

		this.renderer.setAttribute(elem, 'rel', 'noopener noreferrer');

		if (!this.envService.isCordovaMobile) {
			return;
		}

		elem.addEventListener('click', e => {
			if (!elem.href) {
				return;
			}

			e.preventDefault();
			openWindow(elem.href);
		});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
