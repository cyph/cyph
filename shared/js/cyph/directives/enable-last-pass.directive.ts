import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../base-provider';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';

/**
 * Attempts to block LastPass autofilling.
 */
@Directive({
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	selector: 'form:not([cyphEnableLastPass]), input:not([cyphEnableLastPass])'
})
export class EnableLastPassDirective extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		if (!this.elementRef.nativeElement) {
			return;
		}

		const getID = memoize(() => `cyph-search-${uuid()}`);

		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'autocomplete',
			'off'
		);
		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'data-lpignore',
			'true'
		);
		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'role',
			'note'
		);

		if (!this.elementRef.nativeElement.name) {
			this.renderer.setAttribute(
				this.elementRef.nativeElement,
				'name',
				getID()
			);
		}

		if (
			this.elementRef.nativeElement.id &&
			!this.elementRef.nativeElement.id.startsWith('mat-input-')
		) {
			return;
		}

		await sleep(0);
		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'id',
			getID()
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {
		super();
	}
}
