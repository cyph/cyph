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
 * ng2 wrapper for Material1 md-sidenav.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-sidenav'
})
export class MdSidenav
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Sidenav';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@',
			mdComponentId: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly mdComponentId: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class');
			}
		},
		template: `
			<md-sidenav
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-attr-md-component-id='{{$ctrl.mdComponentId}}'
			>
				<ng-transclude></ng-transclude>
			</md-sidenav>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public mdComponentId: string;

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
		super(MdSidenav.title, elementRef, injector);
	}
}
