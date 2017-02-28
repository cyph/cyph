import {
	Directive,
	DoCheck,
	ElementRef,
	EventEmitter,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';


/**
 * ng2 wrapper for Material1 md-input-container + md-select.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-select'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdSelectComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Select';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			disabled: '<',
			formName: '@',
			label: '@',
			model: '=',
			options: '<',
			required: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly disabled: boolean;

			/** @ignore */
			public readonly formName: string;

			/** @ignore */
			public readonly label: string;

			/** @ignore */
			public readonly model: string;

			/** @ignore */
			public readonly options: string[]|{text: string; value: boolean|number|string}[];

			/** @ignore */
			public readonly required: boolean;

			constructor () {}
		},
		template: `
			<md-input-container ng-class='$ctrl.childClass'>
				<md-select
					ng-disabled='$ctrl.disabled'
					ng-attr-name='{{$ctrl.formName}}'
					ng-attr-aria-label='{{$ctrl.label}}'
					ng-model='$ctrl.model'
					ng-required='$ctrl.required'
					aria-label='.'
				>
					<md-option
						ng-repeat='option in $ctrl.options'
						ng-value='option.value || option'
					>
						{{option.text || option}}
					</md-option>
				</md-select>
				<label>{{$ctrl.label}}</label>
			</md-input-container>
		`
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public disabled: boolean;

	/** @ignore */
	@Input() public formName: string;

	/** @ignore */
	@Input() public label: string;

	/** @ignore */
	@Input() public model: string;

	/** @ignore */
	@Output() public modelChange: EventEmitter<string>;

	/** @ignore */
	@Input() public options: string[]|{text: string; value: boolean|number|string}[];

	/** @ignore */
	@Input() public required: boolean;

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	/* tslint:disable-next-line:no-unnecessary-override */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(MdSelectComponent.title, elementRef, injector);
	}
}
