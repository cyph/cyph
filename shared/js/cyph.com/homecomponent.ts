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
import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';


/**
 * Angular component for Cyph home page.
 */
@Directive({
	selector: 'cyph-home'
})
export class HomeComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphHome';

	/** Component configuration. */
	public static config		= {
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public ui: any;

			constructor () { (async () => {
				while (!self['cyph'] || !self['ui']) {
					await Util.sleep();
				}

				this.cyph	= self['cyph'];
				this.ui		= self['ui'];
			})(); }
		},
		template: Templates.home
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
		super(HomeComponent.title, elementRef, injector);
	}
}
