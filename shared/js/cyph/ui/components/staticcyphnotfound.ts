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
 * Angular component for the cyph not found screen.
 */
@Directive({
	selector: 'cyph-static-cyph-not-found'
})
export class StaticCyphNotFound extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphStaticCyphNotFound';

	/** Component configuration. */
	public static config		= {
		template: Templates.staticCyphNotFound,
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
		super(StaticCyphNotFound.title, elementRef, injector);
	}
}
