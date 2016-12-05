import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';


/**
 * ng2 wrapper for Material1 md-fab-speed-dial.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-fab-speed-dial'
})
export class MdFabSpeedDial
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2FabSpeedDial';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			mdDirection: '@',
			mdOpen: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly mdDirection: string;

			/** @ignore */
			public readonly mdOpen: boolean;

			constructor () {}
		},
		template: `
			<md-fab-speed-dial
				ng-class='$ctrl.childClass'
				ng-attr-md-direction='{{$ctrl.mdDirection}}'
				md-open='$ctrl.mdOpen'
				ng-transclude
			></md-fab-speed-dial>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdDirection: string;

	/** @ignore */
	@Input() public mdOpen: boolean;

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
		super(MdFabSpeedDial.title, elementRef, injector);
	}
}
