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
 * ng2 wrapper for Material1 md-slider.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-slider'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdSliderComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			ariaLabel: '@',
			childClass: '@',
			max: '<',
			mdDiscrete: '@',
			min: '<',
			model: '=',
			step: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly ariaLabel: string;

			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly max: number;

			/** @ignore */
			public readonly mdDiscrete: number;

			/** @ignore */
			public readonly min: number;

			/** @ignore */
			public readonly model: number;

			/** @ignore */
			public readonly step: number;

			constructor () {}
		},
		template: `
			<md-slider
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-class='$ctrl.childClass'
				ng-attr-max='{{$ctrl.max}}'
				ng-attr-md-discrete='{{$ctrl.mdDiscrete}}'
				ng-attr-min='{{$ctrl.min}}'
				ng-model='$ctrl.model'
				ng-attr-step='{{$ctrl.step}}'
				aria-label='.'
			></md-slider>
		`
	};

	/** Component title. */
	public static readonly title: string	= 'md2Slider';


	/** @ignore */
	@Input() public ariaLabel: string;

	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public max: number;

	/** @ignore */
	@Input() public mdDiscrete: number;

	/** @ignore */
	@Input() public min: number;

	/** @ignore */
	@Input() public model: number;

	/** @ignore */
	@Output() public modelChange: EventEmitter<number>;

	/** @ignore */
	@Input() public step: number;

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
		super(MdSliderComponent.title, elementRef, injector);
	}
}
