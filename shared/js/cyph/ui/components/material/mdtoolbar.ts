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
export class MdToolbar
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Toolbar';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@',
			id: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly id: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class id');
			}
		},
		template: `
			<md-toolbar
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-attr-id='{{$ctrl.id}}'
			>
				<ng-transclude></ng-transclude>
			</md-toolbar>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public id: string;

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
		super(MdToolbar.title, elementRef, injector);
	}
}
