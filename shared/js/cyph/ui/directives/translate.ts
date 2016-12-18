import {Directive, ElementRef, Renderer} from '@angular/core';
import {config} from '../../config';
import {env} from '../../env';
import {util} from '../../util';


/**
 * Angular directive for translation.
 */
@Directive({
	selector: '[cyphTranslate]'
})
export class Translate {
	/** @ignore */
	private handleElement (
		nativeElement: HTMLElement,
		renderer: Renderer
	) : void {
		const $element	= $(nativeElement);
		const $children	= $element.children();

		for (const attr of ['alt', 'aria-label', 'ariaLabel', 'content', 'label', 'placeholder']) {
			this.translate(
				$element.attr(attr),
				translation => renderer.setElementAttribute(
					nativeElement,
					attr,
					translation
				)
			);
		}

		if ($children.length > 0) {
			for (const child of $children.not('[cyphTranslate]').toArray()) {
				this.handleElement(child, renderer);
			}
		}
		else {
			this.translate(
				$element.text(),
				translation => renderer.setText(
					nativeElement,
					translation
				)
			);
		}
	}

	/** @ignore */
	private translate (
		value: string,
		callback: (translation: string) => void
	) : void {
		if (!value) {
			return;
		}

		const translation	= util.translate(value.trim(), undefined);

		if (!translation) {
			return;
		}

		callback(translation);
	}

	constructor (elementRef: ElementRef, renderer: Renderer) {
		if (env.language === config.defaultLanguage) {
			return;
		}

		if (!elementRef.nativeElement) {
			return;
		}

		this.handleElement(elementRef.nativeElement, renderer);
	}
}
