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
export class MdButton
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Button';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			ariaLabel: '@',
			class: '@',
			click: '&',
			disabled: '<',
			href: '@',
			id: '@',
			rel: '@',
			target: '@',
			type: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly ariaLabel: string;

			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly click: () => void;

			/** @ignore */
			public readonly disabled: boolean;

			/** @ignore */
			public readonly href: string;

			/** @ignore */
			public readonly id: string;

			/** @ignore */
			public readonly rel: string;

			/** @ignore */
			public readonly target: string;

			/** @ignore */
			public readonly type: string;

			constructor ($element: JQuery) {
				$element.removeAttr('aria-label class id');
			}
		},
		template: `
			<md-button
				ng-if='$ctrl.href'
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-click='$ctrl.click && $ctrl.click()'
				ng-disabled='$ctrl.disabled'
				ng-href='{{$ctrl.href}}'
				ng-attr-id='{{$ctrl.id}}'
				ng-attr-rel='{{$ctrl.rel}}'
				ng-attr-target='{{$ctrl.target}}'
				ng-attr-type='{{$ctrl.type}}'
			>
				<ng-transclude></ng-transclude>
			</md-button>
			<md-button
				ng-if='!$ctrl.href'
				ng-attr-aria-label='{{$ctrl.ariaLabel}}'
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-click='$ctrl.click && $ctrl.click()'
				ng-disabled='$ctrl.disabled'
				ng-attr-id='{{$ctrl.id}}'
				ng-attr-rel='{{$ctrl.rel}}'
				ng-attr-target='{{$ctrl.target}}'
				ng-attr-type='{{$ctrl.type}}'
			>
				<ng-transclude></ng-transclude>
			</md-button>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public ariaLabel: string;

	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Output() public click: EventEmitter<void>;

	/** @ignore */
	@Input() public disabled: boolean;

	/** @ignore */
	@Input() public href: string;

	/** @ignore */
	@Input() public id: string;

	/** @ignore */
	@Input() public rel: string;

	/** @ignore */
	@Input() public target: string;

	/** @ignore */
	@Input() public type: string;

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
		super(MdButton.title, elementRef, injector);
	}
}
