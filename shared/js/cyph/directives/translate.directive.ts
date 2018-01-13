import {Directive, ElementRef, Renderer2} from '@angular/core';
import * as $ from 'jquery';
import {ConfigService} from '../services/config.service';
import {EnvService} from '../services/env.service';
import {translate} from '../util/translate';


/**
 * Angular directive for translation.
 */
@Directive({
	selector: '[cyphTranslate]'
})
export class TranslateDirective {
	/** @ignore */
	private handleElement (nativeElement: HTMLElement, renderer: Renderer2) : void {
		const $element	= $(nativeElement);
		const $children	= $element.children();

		for (const attr of ['alt', 'content', 'label', 'matTooltip', 'placeholder']) {
			this.translate(
				$element.attr(attr) || '',
				translation => {
					renderer.setAttribute(nativeElement, attr, translation);
				}
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
				translation => {
					renderer.setValue(nativeElement, translation);
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

	constructor (
		elementRef: ElementRef,
		renderer: Renderer2,
		configService: ConfigService,
		envService: EnvService
	) {
		if (envService.language === configService.defaultLanguage) {
			return;
		}

		if (!elementRef.nativeElement || !envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.handleElement(elementRef.nativeElement, renderer);
	}
}
