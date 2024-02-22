import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import $ from 'jquery';
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
	private handleElement (nativeElement: HTMLElement) : void {
		const $element = $(nativeElement);
		const $children = $element.children();

		for (const attr of [
			'alt',
			'aria-label',
			'content',
			'label',
			'matTooltip',
			'placeholder',
			'title'
		]) {
			this.translate($element.attr(attr) || '', translation => {
				this.renderer.setAttribute(nativeElement, attr, translation);
			});
		}

		if ($children.length > 0) {
			for (const child of $children
				.not('mat-icon, [cyphTranslate]')
				.toArray()) {
				this.handleElement(child);
			}
		}
		else if ($element.is(':not(mat-icon)')) {
			this.translate($element.text(), translation => {
				this.renderer.setValue(nativeElement, translation);
			});
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

		const translation = translate(value.trim(), undefined);

		if (!translation) {
			return;
		}

		callback(translation);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

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
