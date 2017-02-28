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
 * ng2 wrapper for Material1 md-toolbar.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-toolbar'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdToolbarComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			childId: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly childId: string;

			constructor () {}
		},
		template: `
			<md-toolbar
				ng-class='$ctrl.childClass'
				ng-attr-id='{{$ctrl.childId}}'
				ng-transclude
			></md-toolbar>
		`,
		transclude: true
	};

	/** Component title. */
	public static readonly title: string	= 'md2Toolbar';


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public childId: string;

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
		super(MdToolbarComponent.title, elementRef, injector);
	}
}
