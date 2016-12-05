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
 * ng2 wrapper for Material1 md-fab-actions.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-fab-actions'
})
export class MdFabActions
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2FabActions';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			constructor () {}
		},
		template: `
			<md-fab-actions
				ng-class='$ctrl.childClass'
				ng-transclude
			></md-fab-actions>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public childClass: string;

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
		super(MdFabActions.title, elementRef, injector);
	}
}
