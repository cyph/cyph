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
export class MdProgressLinear
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2ProgressLinear';

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
			>
				<ng-transclude></ng-transclude>
			</md-progress-linear>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdMode: string;

	/** @ignore */
	@Input() public value: number;

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
		super(MdProgressLinear.title, elementRef, injector);
	}
}
