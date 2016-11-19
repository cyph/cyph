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
		template: Templates.staticFooter,
		controller: class {
			public Cyph: any;
			public ui: any;

			constructor () { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];
			})(); }
		}
	};


	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(StaticFooter.title, elementRef, injector);
	}
}
