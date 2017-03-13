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
 * ng2 wrapper for Material1 md-icon.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-icon'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdIconComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			icon: '@',
			mdMenuAlignTarget: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly icon: string;

			/** @ignore */
			public readonly mdMenuAlignTarget: string;

			/** @ignore */
			public ready: boolean	= false;

			/** @ignore */
			public $onInit () : void {
				this.ready	= true;
			}

			constructor () {}
		},
		template: `
			<md-icon
				ng-class='$ctrl.childClass'
				ng-attr-md-menu-align-target='{{$ctrl.mdMenuAlignTarget}}'
				ng-if='$ctrl.ready && !$ctrl.icon'
				ng-transclude
			></md-icon>
			<md-icon
				ng-class='$ctrl.childClass'
				ng-attr-md-menu-align-target='{{$ctrl.mdMenuAlignTarget}}'
				ng-if='$ctrl.ready && $ctrl.icon'
			>
				{{$ctrl.icon}}
			</md-icon>
		`,
		transclude: true
	};

	/** Component title. */
	public static readonly title: string	= 'md2Icon';


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public icon: string;

	/** @ignore */
	@Input() public mdMenuAlignTarget: string;

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
		super(MdIconComponent.title, elementRef, injector);
	}
}
