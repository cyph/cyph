import {
	Directive,
	DoCheck,
	ElementRef,
	EventEmitter,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';


/**
 * ng2 wrapper for Material1 md-sidenav.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-sidenav'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdSidenavComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Sidenav';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			mdComponentId: '@',
			mdIsLockedOpen: '<',
			mdIsOpen: '='
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly mdComponentId: string;

			/** @ignore */
			public readonly mdIsLockedOpen: boolean;

			/** @ignore */
			public readonly mdIsOpen: boolean;

			constructor () {}
		},
		template: `
			<md-sidenav
				ng-class='$ctrl.childClass'
				ng-attr-md-component-id='{{$ctrl.mdComponentId}}'
				md-is-locked-open='$ctrl.mdIsLockedOpen'
				md-is-open='$ctrl.mdIsOpen'
				ng-transclude
			></md-sidenav>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdComponentId: string;

	/** @ignore */
	@Input() public mdIsLockedOpen: boolean;

	/** @ignore */
	@Input() public mdIsOpen: boolean;

	/** @ignore */
	@Output() public mdIsOpenChange: EventEmitter<boolean>;

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
		super(MdSidenavComponent.title, elementRef, injector);
	}
}
