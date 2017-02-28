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
 * ng2 wrapper for Material1 md-menu.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-menu'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdMenuComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			button: '<',
			childClass: '@',
			icons: '<',
			mdPositionMode: '@',
			width: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly button: {
				click: ($mdMenu: any) => void;
				icon: string;
				label: string;
			};

			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly items: {
				click: () => void;
				icon: string;
				label: string;
			}[];

			/** @ignore */
			public readonly mdPositionMode: string;

			/** @ignore */
			public readonly width: string;

			constructor () {}
		},
		template: `
			<md-menu
				ng-class='$ctrl.childClass'
				ng-attr-md-position-mode='{{$ctrl.mdPositionMode}}'
			>
				<md-button
					ng-attr-aria-label='{{$ctrl.button.label}}'
					class='md-icon-button'
					ng-click='$ctrl.button.click($mdMenu)'
					aria-label='.'
				>
					<md-icon>{{$ctrl.button.icon}}</md-icon>
				</md-button>
				<md-menu-content ng-attr-width='{{$ctrl.width}}'>
					<md-menu-item ng-repeat='item in $ctrl.items'>
						<md-button
							ng-attr-aria-label='{{item.label}}'
							ng-click='item.click()'
							aria-label='.'
						>
							<md-icon md-menu-align-target>{{item.icon}}</md-icon>
							<span>{{item.label}}</span>
						</md-button>
					</md-menu-item>
				</md-menu-content>
			</md-menu>
		`
	};

	/** Component title. */
	public static readonly title: string	= 'md2Menu';


	/** @ignore */
	@Input() public button: {
		click: ($mdMenu: any) => void;
		icon: string;
		label: string;
	};

	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public items: {
		click: () => void;
		icon: string;
		label: string;
	}[];

	/** @ignore */
	@Input() public mdPositionMode: string;

	/** @ignore */
	@Input() public width: string;

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
		super(MdMenuComponent.title, elementRef, injector);
	}
}
