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
import {Util} from '../cyph/util';


/**
 * Angular component for Cyph home page.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'cyph-home'
})
export class HomeComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'cyphHome';

	/** Component configuration. */
	public static readonly config			= {
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public ui: any;

			constructor () { (async () => {
				while (!cyph || !ui) {
					await Util.sleep();
				}

				this.cyph	= cyph;
				this.ui		= ui;
			})(); }
		},
		templateUrl: '../../templates/cyph.com.html'
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
