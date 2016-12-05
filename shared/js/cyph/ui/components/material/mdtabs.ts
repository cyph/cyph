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
 * ng2 wrapper for Material1 md-tabs.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-tabs'
})
export class MdTabs
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Tabs';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			mdBorderBottom: '@',
			mdDynamicHeight: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly mdBorderBottom: string;

			/** @ignore */
			public readonly mdDynamicHeight: string;

			constructor () {}
		},
		template: `
			<md-tabs
				ng-class='$ctrl.childClass'
				ng-attr-md-border-bottom='{{$ctrl.mdBorderBottom}}'
				ng-attr-md-dynamic-height='{{$ctrl.mdDynamicHeight}}'
				ng-transclude
			></md-tabs>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdBorderBottom: string;

	/** @ignore */
	@Input() public mdDynamicHeight: string;

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
		super(MdTabs.title, elementRef, injector);
	}
}
