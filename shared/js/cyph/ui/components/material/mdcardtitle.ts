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
 * ng2 wrapper for Material1 md-card-title.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-card-title'
})
export class MdCardTitle
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2CardTitle';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class');
			}
		},
		template: `
			<md-card-title ng-attr-class='{{$ctrl.class || ""}}'>
				<ng-transclude></ng-transclude>
			</md-card-title>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

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
		super(MdCardTitle.title, elementRef, injector);
	}
}
