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
 * ng2 wrapper for Material1 md-button.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-button'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdButtonComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			ariaLabel: '@',
			childClass: '@',
			childClick: '&',
			childId: '@',
			disabled: '<',
			href: '@',
			rel: '@',
			target: '@',
			type: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly ariaLabel: string;

			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly childClick: () => void;

			/** @ignore */
			public readonly childId: string;

			/** @ignore */
			public readonly disabled: boolean;

			/** @ignore */
			public readonly href: string;

			/** @ignore */
			public readonly rel: string;

			/** @ignore */
			public readonly target: string;

			/** @ignore */
			/* tslint:disable-next-line:no-reserved-keywords */
			public readonly type: string;

			constructor () {}
		},
		template: `
			<md-button
				ng-if='$ctrl.href'
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-class='$ctrl.childClass'
				ng-click='$ctrl.childClick && $ctrl.childClick()'
				ng-disabled='$ctrl.disabled'
				ng-href='{{$ctrl.href}}'
				ng-attr-id='{{$ctrl.childId}}'
				ng-attr-rel='{{$ctrl.rel}}'
				ng-attr-target='{{$ctrl.target}}'
				ng-attr-type='{{$ctrl.type}}'
				aria-label='.'
			>
				<ng-transclude></ng-transclude>
			</md-button>
			<md-button
				ng-if='!$ctrl.href'
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-class='$ctrl.childClass'
				ng-click='$ctrl.childClick && $ctrl.childClick()'
				ng-disabled='$ctrl.disabled'
				ng-attr-id='{{$ctrl.childId}}'
				ng-attr-rel='{{$ctrl.rel}}'
				ng-attr-target='{{$ctrl.target}}'
				ng-attr-type='{{$ctrl.type}}'
				aria-label='.'
			>
				<ng-transclude></ng-transclude>
			</md-button>
		`,
		transclude: true
	};

	/** Component title. */
	public static readonly title: string	= 'md2Button';


	/** @ignore */
	@Input() public ariaLabel: string;

	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Output() public childClick: EventEmitter<void>;

	/** @ignore */
	@Input() public childId: string;

	/** @ignore */
	@Input() public disabled: boolean;

	/** @ignore */
	@Input() public href: string;

	/** @ignore */
	@Input() public rel: string;

	/** @ignore */
	@Input() public target: string;

	/** @ignore */
	/* tslint:disable-next-line:no-reserved-keywords */
	@Input() public type: string;

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
		super(MdButtonComponent.title, elementRef, injector);
	}
}
