import {Templates} from '../cyph/ui/templates';
import {Util} from '../cyph/util';
import {UpgradeComponent} from '@angular/upgrade/static';
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


/**
 * Angular component for Cyph home page.
 */
@Directive({
	selector: 'cyph-app'
})
export class AppComponent extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphStaticFooter';

	/** Component configuration. */
	public static config		= {
		controller: AppComponent,
		template: Templates.home
	};


	public Cyph: any;
	public ui: any;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(AppComponent.title, elementRef, injector);

		(async () => {
			while (!self['Cyph'] || !self['ui']) {
				await Util.sleep(100);
			}

			this.Cyph	= self['Cyph'];
			this.ui		= self['ui'];
		})();
	}
}
