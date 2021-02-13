import {
	Directive,
	ElementRef,
	Host,
	Inject,
	Input,
	OnDestroy,
	OnInit,
	Optional
} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IProductTourDirective} from '../directive-interfaces/iproduct-tour.directive';
import {ProductTourService} from '../services/product-tour.service';
import {TranslateDirective} from './translate.directive';

/** @see IProductTourDirective */
@Directive({
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	selector: '[cyphProductTourContent][cyphProductTourOrder]'
})
export class ProductTourDirective extends BaseProvider
	implements IProductTourDirective, OnDestroy, OnInit {
	/** @inheritDoc */
	@Input() public cyphProductTourContent: string = '';

	/** @inheritDoc */
	@Input() public cyphProductTourOrder: number = 0;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.productTourService.items.delete(this);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.productTourService.items.add(this);
	}

	/** @inheritDoc */
	public get translate () : boolean {
		return this.translateDirective !== undefined;
	}

	constructor (
		/** @ignore */
		private readonly productTourService: ProductTourService,

		/** @ignore */
		@Host()
		@Inject(TranslateDirective)
		@Optional()
		private translateDirective: TranslateDirective | undefined,

		/** @inheritDoc */
		public readonly elementRef: ElementRef<HTMLElement>
	) {
		super();
	}
}
