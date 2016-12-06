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
import {Util} from '../../../util';


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
			childClass: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			constructor ($element: JQuery) { (async () => {
				let $input: JQuery;
				while (!$input || $input.length < 1) {
					$input	= $element.find('input, select, textarea');
					await Util.sleep();
				}

				$input.addClass('md-input');
			})(); }
		},
		template: `
			<md-input-container
				ng-class='$ctrl.childClass'
				ng-transclude
			></md-input-container>
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
		super(MdInputContainer.title, elementRef, injector);
	}
}
