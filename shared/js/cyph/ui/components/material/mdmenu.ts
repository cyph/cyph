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
 * ng2 wrapper for Material1 md-menu.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-menu'
})
export class MdMenu
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Menu';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@',
			mdPositionMode: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly mdPositionMode: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class');
			}
		},
		template: `
			<md-menu
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-attr-md-position-mode='{{$ctrl.mdPositionMode}}'
			>
				<ng-transclude></ng-transclude>
			</md-menu>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public mdPositionMode: string;

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
		super(MdMenu.title, elementRef, injector);
	}
}
