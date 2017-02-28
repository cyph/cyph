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
 * ng2 wrapper for Material1 md-fab-speed-dial.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-fab-speed-dial'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdFabSpeedDialComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			ariaLabel: '@',
			buttons: '<',
			childClass: '@',
			icon: '@',
			mdDirection: '@',
			mdOpen: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly ariaLabel: string;

			/** @ignore */
			public readonly buttons: {
				click?: () => void;
				cssClass?: string;
				disabled?: () => boolean;
				fileAccept?: string;
				fileChange?: ($event: File) => void;
				icon: string;
				label: string;
				tooltipDirection: string;
			}[];

			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly icon: string;

			/** @ignore */
			public readonly mdDirection: string;

			/** @ignore */
			public readonly mdOpen: boolean;

			constructor () {}
		},

		/*
			The alternative copied here doesn't work correctly.
			Just copypasta more instances as needed.

			```
				<md-button
					ng-repeat='button in $ctrl.buttons'
					aria-label='{{button.label}}'
					ng-click='button.click && button.click()'
					ng-disabled='button.disabled && button.disabled()'
					class='md-fab md-raised md-mini'
				>
					<md-tooltip ng-attr-md-direction='{{button.tooltipDirection}}'>
						{{button.label}}
					</md-tooltip>
					<md-icon>{{button.icon}}</md-icon>
					<cyph-file-input
						ng-if='button.fileChange'
						[accept]='button.fileAccept'
						(change)='button.fileChange($event)'
					></cyph-file-input>
				</md-button>
			```
		*/

		template: `
			<md-fab-speed-dial
				ng-class='$ctrl.childClass'
				ng-attr-md-direction='{{$ctrl.mdDirection}}'
				md-open='$ctrl.mdOpen'
			>
				<md-fab-trigger>
					<md-button
						ng-attr-aria-label='{{$ctrl.ariaLabel}}'
						aria-label='.'
						class='md-fab'
					>
						<md-icon>{{$ctrl.icon}}</md-icon>
					</md-button>
				</md-fab-trigger>
				<md-fab-actions>
					<md-button
						ng-if='$ctrl.buttons[0]'
						aria-label='{{$ctrl.buttons[0].label}}'
						ng-class='$ctrl.buttons[0].cssClass'
						ng-click='$ctrl.buttons[0].click && $ctrl.buttons[0].click()'
						ng-disabled='$ctrl.buttons[0].disabled && $ctrl.buttons[0].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[0].tooltipDirection}}'>
							{{$ctrl.buttons[0].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[0].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[0].fileChange'
							[accept]='$ctrl.buttons[0].fileAccept'
							(change)='$ctrl.buttons[0].fileChange($event)'
						></cyph-file-input>
					</md-button>
					<md-button
						ng-if='$ctrl.buttons[1]'
						aria-label='{{$ctrl.buttons[1].label}}'
						ng-class='$ctrl.buttons[1].cssClass'
						ng-click='$ctrl.buttons[1].click && $ctrl.buttons[1].click()'
						ng-disabled='$ctrl.buttons[1].disabled && $ctrl.buttons[1].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[1].tooltipDirection}}'>
							{{$ctrl.buttons[1].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[1].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[1].fileChange'
							[accept]='$ctrl.buttons[1].fileAccept'
							(change)='$ctrl.buttons[1].fileChange($event)'
						></cyph-file-input>
					</md-button>
					<md-button
						ng-if='$ctrl.buttons[2]'
						aria-label='{{$ctrl.buttons[2].label}}'
						ng-class='$ctrl.buttons[2].cssClass'
						ng-click='$ctrl.buttons[2].click && $ctrl.buttons[2].click()'
						ng-disabled='$ctrl.buttons[2].disabled && $ctrl.buttons[2].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[2].tooltipDirection}}'>
							{{$ctrl.buttons[2].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[2].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[2].fileChange'
							[accept]='$ctrl.buttons[2].fileAccept'
							(change)='$ctrl.buttons[2].fileChange($event)'
						></cyph-file-input>
					</md-button>
					<md-button
						ng-if='$ctrl.buttons[3]'
						aria-label='{{$ctrl.buttons[3].label}}'
						ng-class='$ctrl.buttons[3].cssClass'
						ng-click='$ctrl.buttons[3].click && $ctrl.buttons[3].click()'
						ng-disabled='$ctrl.buttons[3].disabled && $ctrl.buttons[3].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[3].tooltipDirection}}'>
							{{$ctrl.buttons[3].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[3].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[3].fileChange'
							[accept]='$ctrl.buttons[3].fileAccept'
							(change)='$ctrl.buttons[3].fileChange($event)'
						></cyph-file-input>
					</md-button>
					<md-button
						ng-if='$ctrl.buttons[4]'
						aria-label='{{$ctrl.buttons[4].label}}'
						ng-class='$ctrl.buttons[4].cssClass'
						ng-click='$ctrl.buttons[4].click && $ctrl.buttons[4].click()'
						ng-disabled='$ctrl.buttons[4].disabled && $ctrl.buttons[4].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[4].tooltipDirection}}'>
							{{$ctrl.buttons[4].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[4].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[4].fileChange'
							[accept]='$ctrl.buttons[4].fileAccept'
							(change)='$ctrl.buttons[4].fileChange($event)'
						></cyph-file-input>
					</md-button>
					<md-button
						ng-if='$ctrl.buttons[5]'
						aria-label='{{$ctrl.buttons[5].label}}'
						ng-class='$ctrl.buttons[5].cssClass'
						ng-click='$ctrl.buttons[5].click && $ctrl.buttons[5].click()'
						ng-disabled='$ctrl.buttons[5].disabled && $ctrl.buttons[5].disabled()'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip ng-attr-md-direction='{{$ctrl.buttons[5].tooltipDirection}}'>
							{{$ctrl.buttons[5].label}}
						</md-tooltip>
						<md-icon>{{$ctrl.buttons[5].icon}}</md-icon>
						<cyph-file-input
							ng-if='$ctrl.buttons[5].fileChange'
							[accept]='$ctrl.buttons[5].fileAccept'
							(change)='$ctrl.buttons[5].fileChange($event)'
						></cyph-file-input>
					</md-button>
				</md-fab-actions>
			</md-fab-speed-dial>
		`
	};

	/** Component title. */
	public static readonly title: string	= 'md2FabSpeedDial';


	/** @ignore */
	@Input() public ariaLabel: string;

	/** @ignore */
	@Input() public buttons: {
		click?: () => void;
		cssClass?: string;
		disabled?: () => boolean;
		fileAccept?: string;
		fileChange?: ($event: File) => void;
		icon: string;
		label: string;
		tooltipDirection: string;
	}[];

	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public icon: string;

	/** @ignore */
	@Input() public mdDirection: string;

	/** @ignore */
	@Input() public mdOpen: boolean;

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
		super(MdFabSpeedDialComponent.title, elementRef, injector);
	}
}
