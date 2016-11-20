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
export class HomeComponent extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphHome';

	/** Component configuration. */
	public static config		= {
		controller: class {
			public Cyph: any;
			public ui: any;

			constructor () { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];
			})(); }
		},
		template: Templates.home
	};


	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(HomeComponent.title, elementRef, injector);
	}
}
