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


/**
 * Angular component for Cyph beta UI.
 */
@Directive({
	selector: 'cyph-beta'
})
export class Beta
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'cyphBeta';

	/** Component configuration. */
	public static readonly config			= {
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public ui: any;

			/** @ignore */
			public checking: boolean	= false;

			/** @ignore */
			public error: boolean		= false;

			constructor ($element: JQuery) { (async () => {
				while (!cyph || !ui) {
					await Util.sleep();
				}

				this.cyph	= cyph;
				this.ui		= ui;

				/* TODO: stop blatantly lying to people */
				$element.find('form').submit(async () => {
					this.checking	= true;
					this.error		= false;

					await Util.sleep(Util.random(4000, 1500));
					this.checking	= false;
					this.error		= true;
				});
			})(); }
		},
		templateUrl: '../../../../templates/beta.html'
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
		super(Beta.title, elementRef, injector);
	}
}
