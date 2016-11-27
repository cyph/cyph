import {Directive, ElementRef, Renderer} from '@angular/core';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular directive for translation.
 */
@Directive({
	selector: '[cyphTranslate]'
})
export class Translate {
	/** Directive title. */
	public static readonly title: string	= 'cyphTranslate';

	/** @ignore */
	private static translate (
		value: string,
		callback: (translation: string) => void
	) : void {
		if (!value) {
			return;
		}

		const translation	= Util.translate(value.trim(), null);

		if (!translation) {
			return;
		}

		callback(translation);
	}

	/** Directive configuration. */
	public static config () : angular.IDirective {
		return {
			controller: ['$element', Translate],
			restrict: 'A'
		};
	}


	constructor (elementRef: ElementRef, renderer?: Renderer) {
		if (Env.language === Config.defaultLanguage) {
			return;
		}

		/* Temporary polyfill for ng1 */
		if (!renderer) {
			elementRef	= <ElementRef> {
				nativeElement: (<any> elementRef)[0]
			};

			renderer	= <Renderer> {
				setElementAttribute: (nativeElement: any, attr: string, value: string) => {
					$(nativeElement).attr(attr, value);
				},
				setText: (nativeElement: any, text: string) => {
					$(nativeElement).text(text);
				}
			};
		}

		if (!elementRef.nativeElement) {
			return;
		}

		const $element	= $(elementRef.nativeElement);

		for (let attr of ['alt', 'aria-label', 'content', 'label', 'placeholder']) {
			Translate.translate(
				$element.attr(attr),
				translation => renderer.setElementAttribute(
					elementRef.nativeElement,
					attr,
					translation
				)
			);
		}

		if ($element.children().length > 0) {
			return;
		}

		Translate.translate(
			$element.text(),
			translation => renderer.setText(
				elementRef.nativeElement,
				translation
			)
		);
	}
}
