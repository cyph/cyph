import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {ConfigService} from '../services/config.service';
import {EnvService} from '../services/env.service';
import {translate} from '../util/translate';


/**
 * Angular directive for translation.
 */
@Directive({
	selector: '[cyphTranslate]'
})
export class TranslateDirective extends BaseProvider implements OnInit {
	/** @ignore */
	private handleElement (elem: Element) : void {
		const children	= Array.from(elem.children);

		for (const attr of [
			'alt',
			'aria-label',
			'content',
			'label',
			'matTooltip',
			'placeholder',
			'title'
		]) {
			this.translate(
				elem.getAttribute(attr) || '',
				translation => {
					this.renderer.setAttribute(elem, attr, translation);
				}
			);
		}

		if (children.length > 0) {
			for (const child of children) {
				if (child.tagName !== 'MAT-ICON' && !child.hasAttribute('cyphTranslate')) {
					this.handleElement(child);
				}
			}
		}
		else if (elem.tagName !== 'MAT-ICON') {
			this.translate(
				elem.textContent || '',
				translation => {
					this.renderer.setValue(elem, translation);
				}
			);
		}
	}

	/** @ignore */
	private translate (value: string, callback: (translation: string) => void) : void {
		if (!value) {
			return;
		}

		const translation	= translate(value.trim(), undefined);

		if (!translation) {
			return;
		}

		callback(translation);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		if (this.envService.language === this.configService.defaultLanguage) {
			return;
		}

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.handleElement(this.elementRef.nativeElement);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
