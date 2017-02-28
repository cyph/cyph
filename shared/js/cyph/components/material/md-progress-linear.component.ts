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
 * ng2 wrapper for Material1 md-progress-linear.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-progress-linear'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdProgressLinearComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			mdMode: '@',
			value: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly mdMode: string;

			/** @ignore */
			public readonly value: number;

			constructor () {}
		},
		template: `
			<md-progress-linear
				ng-class='$ctrl.childClass'
				ng-attr-md-mode='{{$ctrl.mdMode}}'
				ng-value='$ctrl.value'
			></md-progress-linear>
		`
	};

	/** Component title. */
	public static readonly title: string	= 'md2ProgressLinear';


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdMode: string;

	/** @ignore */
	@Input() public value: number;

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(MdProgressLinearComponent.title, elementRef, injector);
	}
}
