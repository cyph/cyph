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
 * Angular component for Cyph beta UI.
 */
@Directive({
	selector: 'cyph-beta'
})
export class Beta extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphBeta';

	/** Component configuration. */
	public static config		= {
		template: Templates.beta,
		controller: class {
			public Cyph: any;
			public ui: any;

			public checking: boolean	= false;
			public error: boolean		= false;

			constructor ($element) { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];

				/* TODO: stop blatantly lying to people */
				$element.find('form').submit(() => {
					this.checking	= true;
					this.error		= false;
					this.ui.controller.update();

					setTimeout(() => {
						this.checking	= false;
						this.error		= true;
						this.ui.controller.update();
					}, Util.random(4000, 1500));
				});
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
		super(Beta.title, elementRef, injector);
	}
}
