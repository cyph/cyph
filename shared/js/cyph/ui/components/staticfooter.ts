import {Templates} from '../templates';
import {Util} from '../../util';
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
 * Angular component for static footer content.
 */
@Directive({
	selector: 'cyph-static-footer'
})
export class StaticFooter extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphStaticFooter';

	/** Component configuration. */
	public static config		= {
		controller: StaticFooter,
		template: Templates.staticFooter
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
		super(StaticFooter.title, elementRef, injector);

		(async () => {
			while (!self['Cyph'] || !self['ui']) {
				await Util.sleep(100);
			}

			this.Cyph	= self['Cyph'];
			this.ui		= self['ui'];
		})();
	}
}
