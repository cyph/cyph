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
export class MdIcon
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Icon';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			mdMenuAlignTarget: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly mdMenuAlignTarget: string;

			constructor () {}
		},
		template: `
			<md-icon
				ng-class='$ctrl.childClass'
				ng-attr-md-menu-align-target='{{$ctrl.mdMenuAlignTarget}}'
				ng-transclude
			></md-icon>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public mdMenuAlignTarget: string;

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
		super(MdIcon.title, elementRef, injector);
	}
}
