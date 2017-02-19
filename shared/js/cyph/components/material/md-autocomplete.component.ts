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
 * ng2 wrapper for Material1 md-autocomplete.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-autocomplete'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdAutocompleteComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Autocomplete';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			disabled: '<',
			formName: '@',
			items: '<',
			placeholder: '@',
			required: '<',
			searchText: '=',
			selectedItem: '='
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
			public readonly items: {display: string; value: string}[];

			/** @ignore */
			public readonly placeholder: string;

			/** @ignore */
			public readonly required: boolean;

			/** @ignore */
			public readonly searchText: string;

			/** @ignore */
			public readonly selectedItem: {display: string; value: string};

			constructor () {}
		},
		template: `
			<md-autocomplete
				ng-class='$ctrl.childClass'
				ng-disabled='$ctrl.disabled'
				md-input-name='{{$ctrl.formName}}'
				md-items='item in $ctrl.items'
				md-item-text='item.display'
				ng-attr-aria-label='{{$ctrl.placeholder}}'
				ng-attr-placeholder='{{$ctrl.placeholder}}'
				ng-required='$ctrl.required'
				md-search-text='$ctrl.searchText'
				md-selected-item='$ctrl.selectedItem'
				aria-label='.'
			>
				<span md-highlight-text='$ctrl.searchText'>{{item.display}}</span>
			</md-autocomplete>
		`
	};


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public disabled: boolean;

	/** @ignore */
	@Input() public formName: string;

	/** @ignore */
	@Input() public items: {display: string; value: string}[];

	/** @ignore */
	@Input() public placeholder: string;

	/** @ignore */
	@Input() public required: boolean;

	/** @ignore */
	@Input() public searchText: string;

	/** @ignore */
	@Output() public searchTextChange: EventEmitter<string>;

	/** @ignore */
	@Input() public selectedItem: {display: string; value: string};

	/** @ignore */
	@Output() public selectedItemChange: EventEmitter<{display: string; value: string}>;

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
		super(MdAutocompleteComponent.title, elementRef, injector);
	}
}
