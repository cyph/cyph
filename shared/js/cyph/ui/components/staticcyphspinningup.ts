import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Util} from '../../util';
import {Templates} from '../templates';


/**
 * Angular component for the new cyph spin-up screen.
 */
@Directive({
	selector: 'cyph-static-cyph-spinning-up'
})
export class StaticCyphSpinningUp
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphStaticCyphSpinningUp';

	/** Component configuration. */
	public static config		= {
		controller: class {
			/** @ignore */
			public Cyph: any;

			/** @ignore */
			public ui: any;

			constructor () { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];
			})(); }
		},
		template: Templates.staticCyphSpinningUp
	};


	/** @ignore */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(StaticCyphSpinningUp.title, elementRef, injector);
	}
}
