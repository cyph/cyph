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
 * ng2 wrapper for Material1 md-subheader.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-subheader'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdSubheaderComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			html: '<',
			stickyState: '@',
			text: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly html: string;

			/** @ignore */
			public readonly stickyState: string;

			/** @ignore */
			public readonly text: string;

			/** @ignore */
			public trustedHtml: any;

			/** @ignore */
			public $onChanges () : void {
				if (!this.html) {
					return;
				}

				this.trustedHtml	= this.$sce.trustAsHtml(this.html);
			}

			constructor (
				/** @ignore */
				private readonly $sce: any
			) {}
		},
		template: `
			<md-subheader
				ng-class='$ctrl.childClass'
				ng-attr-sticky-state='{{$ctrl.stickyState}}'
			>
				<span ng-if='!$ctrl.trustedHtml'>{{$ctrl.text}}</span>
				<span ng-if='$ctrl.trustedHtml' ng-bind-html='$ctrl.trustedHtml'></span>
			</md-subheader>
		`
	};

	/** Component title. */
	public static readonly title: string	= 'md2Subheader';


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public html: string;

	/** @ignore */
	@Input() public stickyState: string;

	/** @ignore */
	@Input() public text: string;

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
		super(MdSubheaderComponent.title, elementRef, injector);
	}
}
