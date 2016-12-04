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
 * ng2 wrapper for Material1 md-menu-content.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-menu-content'
})
export class MdMenuContent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2MenuContent';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@',
			width: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly width: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class');
			}
		},
		template: `
			<md-menu-content
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-attr-width='{{$ctrl.width}}'
			>
				<ng-transclude></ng-transclude>
			</md-menu-content>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public width: string;

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
		super(MdMenuContent.title, elementRef, injector);
	}
}
