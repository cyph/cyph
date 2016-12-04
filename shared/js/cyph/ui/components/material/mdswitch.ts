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
 * ng2 wrapper for Material1 md-switch.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-switch'
})
export class MdSwitch
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Switch';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			ariaLabel: '@',
			class: '@',
			model: '='
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly ariaLabel: string;

			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly model: boolean;

			constructor ($element: JQuery) {
				$element.removeAttr('aria-label class');
			}
		},
		template: `
			<md-switch
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-model='$ctrl.model'
			>
				<ng-transclude></ng-transclude>
			</md-switch>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public ariaLabel: string;

	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public model: number;

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
		super(MdSwitch.title, elementRef, injector);
	}
}
