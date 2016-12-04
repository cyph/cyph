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
 * ng2 wrapper for Material1 md-input-container.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-input-container'
})
export class MdInputContainer
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2InputContainer';

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
				$element.find('input').addClass('md-input');
			}
		},
		template: `
			<md-input-container ng-attr-class='{{$ctrl.class || ""}}'>
				<ng-transclude></ng-transclude>
			</md-input-container>
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
		super(MdInputContainer.title, elementRef, injector);
	}
}
