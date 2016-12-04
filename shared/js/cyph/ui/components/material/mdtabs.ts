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
 * ng2 wrapper for Material1 md-tabs.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md-tabs'
})
export class MdTabs
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'ng2MdTabs';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			class: '@',
			flex: '@',
			flexGtLg: '@',
			flexGtMd: '@',
			flexGtSm: '@',
			flexGtXs: '@',
			flexLg: '@',
			flexMd: '@',
			flexSm: '@',
			flexXl: '@',
			flexXs: '@',
			hide: '@',
			hideGtLg: '@',
			hideGtMd: '@',
			hideGtSm: '@',
			hideGtXs: '@',
			hideLg: '@',
			hideMd: '@',
			hideSm: '@',
			hideXl: '@',
			hideXs: '@',
			layout: '@',
			layoutAlign: '@',
			layoutAlignGtLg: '@',
			layoutAlignGtMd: '@',
			layoutAlignGtSm: '@',
			layoutAlignGtXs: '@',
			layoutAlignLg: '@',
			layoutAlignMd: '@',
			layoutAlignSm: '@',
			layoutAlignXl: '@',
			layoutAlignXs: '@',
			layoutFill: '@',
			layoutGtLg: '@',
			layoutGtMd: '@',
			layoutGtSm: '@',
			layoutGtXs: '@',
			layoutLg: '@',
			layoutMd: '@',
			layoutPadding: '@',
			layoutSm: '@',
			layoutXl: '@',
			layoutXs: '@',
			mdBorderBottom: '@',
			mdDynamicHeight: '@',
			show: '@',
			showGtLg: '@',
			showGtMd: '@',
			showGtSm: '@',
			showGtXs: '@',
			showLg: '@',
			showMd: '@',
			showSm: '@',
			showXl: '@',
			showXs: '@'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly class: string;

			/** @ignore */
			public readonly flex: string;

			/** @ignore */
			public readonly flexGtLg: string;

			/** @ignore */
			public readonly flexGtMd: string;

			/** @ignore */
			public readonly flexGtSm: string;

			/** @ignore */
			public readonly flexGtXs: string;

			/** @ignore */
			public readonly flexLg: string;

			/** @ignore */
			public readonly flexMd: string;

			/** @ignore */
			public readonly flexSm: string;

			/** @ignore */
			public readonly flexXl: string;

			/** @ignore */
			public readonly flexXs: string;

			/** @ignore */
			public readonly hide: string;

			/** @ignore */
			public readonly hideGtLg: string;

			/** @ignore */
			public readonly hideGtMd: string;

			/** @ignore */
			public readonly hideGtSm: string;

			/** @ignore */
			public readonly hideGtXs: string;

			/** @ignore */
			public readonly hideLg: string;

			/** @ignore */
			public readonly hideMd: string;

			/** @ignore */
			public readonly hideSm: string;

			/** @ignore */
			public readonly hideXl: string;

			/** @ignore */
			public readonly hideXs: string;

			/** @ignore */
			public readonly layout: string;

			/** @ignore */
			public readonly layoutAlign: string;

			/** @ignore */
			public readonly layoutAlignGtLg: string;

			/** @ignore */
			public readonly layoutAlignGtMd: string;

			/** @ignore */
			public readonly layoutAlignGtSm: string;

			/** @ignore */
			public readonly layoutAlignGtXs: string;

			/** @ignore */
			public readonly layoutAlignLg: string;

			/** @ignore */
			public readonly layoutAlignMd: string;

			/** @ignore */
			public readonly layoutAlignSm: string;

			/** @ignore */
			public readonly layoutAlignXl: string;

			/** @ignore */
			public readonly layoutAlignXs: string;

			/** @ignore */
			public readonly layoutFill: string;

			/** @ignore */
			public readonly layoutGtLg: string;

			/** @ignore */
			public readonly layoutGtMd: string;

			/** @ignore */
			public readonly layoutGtSm: string;

			/** @ignore */
			public readonly layoutGtXs: string;

			/** @ignore */
			public readonly layoutLg: string;

			/** @ignore */
			public readonly layoutMd: string;

			/** @ignore */
			public readonly layoutPadding: string;

			/** @ignore */
			public readonly layoutSm: string;

			/** @ignore */
			public readonly layoutXl: string;

			/** @ignore */
			public readonly layoutXs: string;

			/** @ignore */
			public readonly mdBorderBottom: string;

			/** @ignore */
			public readonly mdDynamicHeight: string;

			/** @ignore */
			public readonly show: string;

			/** @ignore */
			public readonly showGtLg: string;

			/** @ignore */
			public readonly showGtMd: string;

			/** @ignore */
			public readonly showGtSm: string;

			/** @ignore */
			public readonly showGtXs: string;

			/** @ignore */
			public readonly showLg: string;

			/** @ignore */
			public readonly showMd: string;

			/** @ignore */
			public readonly showSm: string;

			/** @ignore */
			public readonly showXl: string;

			/** @ignore */
			public readonly showXs: string;

			constructor ($element: JQuery) {
				$element.removeAttr('class');
			}
		},
		template: `
			<md-tabs
				ng-attr-class='{{$ctrl.class || ""}}'
				ng-attr-flex='{{$ctrl.flex}}'
				ng-attr-flex-gt-lg='{{$ctrl.flexGtLg}}'
				ng-attr-flex-gt-md='{{$ctrl.flexGtMd}}'
				ng-attr-flex-gt-sm='{{$ctrl.flexGtSm}}'
				ng-attr-flex-gt-xs='{{$ctrl.flexGtXs}}'
				ng-attr-flex-lg='{{$ctrl.flexLg}}'
				ng-attr-flex-md='{{$ctrl.flexMd}}'
				ng-attr-flex-sm='{{$ctrl.flexSm}}'
				ng-attr-flex-xl='{{$ctrl.flexXl}}'
				ng-attr-flex-xs='{{$ctrl.flexXs}}'
				ng-attr-hide='{{$ctrl.hide}}'
				ng-attr-hide-gt-lg='{{$ctrl.hideGtLg}}'
				ng-attr-hide-gt-md='{{$ctrl.hideGtMd}}'
				ng-attr-hide-gt-sm='{{$ctrl.hideGtSm}}'
				ng-attr-hide-gt-xs='{{$ctrl.hideGtXs}}'
				ng-attr-hide-lg='{{$ctrl.hideLg}}'
				ng-attr-hide-md='{{$ctrl.hideMd}}'
				ng-attr-hide-sm='{{$ctrl.hideSm}}'
				ng-attr-hide-xl='{{$ctrl.hideXl}}'
				ng-attr-hide-xs='{{$ctrl.hideXs}}'
				ng-attr-layout='{{$ctrl.layout}}'
				ng-attr-layout-align='{{$ctrl.layoutAlign}}'
				ng-attr-layout-align-gt-lg='{{$ctrl.layoutAlignGtLg}}'
				ng-attr-layout-align-gt-md='{{$ctrl.layoutAlignGtMd}}'
				ng-attr-layout-align-gt-sm='{{$ctrl.layoutAlignGtSm}}'
				ng-attr-layout-align-gt-xs='{{$ctrl.layoutAlignGtXs}}'
				ng-attr-layout-align-lg='{{$ctrl.layoutAlignLg}}'
				ng-attr-layout-align-md='{{$ctrl.layoutAlignMd}}'
				ng-attr-layout-align-sm='{{$ctrl.layoutAlignSm}}'
				ng-attr-layout-align-xl='{{$ctrl.layoutAlignXl}}'
				ng-attr-layout-align-xs='{{$ctrl.layoutAlignXs}}'
				ng-attr-layout-fill='{{$ctrl.layoutFill}}'
				ng-attr-layout-gt-lg='{{$ctrl.layoutGtLg}}'
				ng-attr-layout-gt-md='{{$ctrl.layoutGtMd}}'
				ng-attr-layout-gt-sm='{{$ctrl.layoutGtSm}}'
				ng-attr-layout-gt-xs='{{$ctrl.layoutGtXs}}'
				ng-attr-layout-lg='{{$ctrl.layoutLg}}'
				ng-attr-layout-md='{{$ctrl.layoutMd}}'
				ng-attr-layout-padding='{{$ctrl.layoutPadding}}'
				ng-attr-layout-sm='{{$ctrl.layoutSm}}'
				ng-attr-layout-xl='{{$ctrl.layoutXl}}'
				ng-attr-layout-xs='{{$ctrl.layoutXs}}'
				ng-attr-md-border-bottom='{{$ctrl.mdBorderBottom}}'
				ng-attr-md-dynamic-height='{{$ctrl.mdDynamicHeight}}'
				ng-attr-show='{{$ctrl.show}}'
				ng-attr-show-gt-lg='{{$ctrl.showGtLg}}'
				ng-attr-show-gt-md='{{$ctrl.showGtMd}}'
				ng-attr-show-gt-sm='{{$ctrl.showGtSm}}'
				ng-attr-show-gt-xs='{{$ctrl.showGtXs}}'
				ng-attr-show-lg='{{$ctrl.showLg}}'
				ng-attr-show-md='{{$ctrl.showMd}}'
				ng-attr-show-sm='{{$ctrl.showSm}}'
				ng-attr-show-xl='{{$ctrl.showXl}}'
				ng-attr-show-xs='{{$ctrl.showXs}}'
			>
				<ng-transclude></ng-transclude>
			</md-tabs>
		`,
		transclude: true
	};


	/** @ignore */
	@Input() public class: string;

	/** @ignore */
	@Input() public flex: string;

	/** @ignore */
	@Input() public flexGtLg: string;

	/** @ignore */
	@Input() public flexGtMd: string;

	/** @ignore */
	@Input() public flexGtSm: string;

	/** @ignore */
	@Input() public flexGtXs: string;

	/** @ignore */
	@Input() public flexLg: string;

	/** @ignore */
	@Input() public flexMd: string;

	/** @ignore */
	@Input() public flexSm: string;

	/** @ignore */
	@Input() public flexXl: string;

	/** @ignore */
	@Input() public flexXs: string;

	/** @ignore */
	@Input() public hide: string;

	/** @ignore */
	@Input() public hideGtLg: string;

	/** @ignore */
	@Input() public hideGtMd: string;

	/** @ignore */
	@Input() public hideGtSm: string;

	/** @ignore */
	@Input() public hideGtXs: string;

	/** @ignore */
	@Input() public hideLg: string;

	/** @ignore */
	@Input() public hideMd: string;

	/** @ignore */
	@Input() public hideSm: string;

	/** @ignore */
	@Input() public hideXl: string;

	/** @ignore */
	@Input() public hideXs: string;

	/** @ignore */
	@Input() public layout: string;

	/** @ignore */
	@Input() public layoutAlign: string;

	/** @ignore */
	@Input() public layoutAlignGtLg: string;

	/** @ignore */
	@Input() public layoutAlignGtMd: string;

	/** @ignore */
	@Input() public layoutAlignGtSm: string;

	/** @ignore */
	@Input() public layoutAlignGtXs: string;

	/** @ignore */
	@Input() public layoutAlignLg: string;

	/** @ignore */
	@Input() public layoutAlignMd: string;

	/** @ignore */
	@Input() public layoutAlignSm: string;

	/** @ignore */
	@Input() public layoutAlignXl: string;

	/** @ignore */
	@Input() public layoutAlignXs: string;

	/** @ignore */
	@Input() public layoutFill: string;

	/** @ignore */
	@Input() public layoutGtLg: string;

	/** @ignore */
	@Input() public layoutGtMd: string;

	/** @ignore */
	@Input() public layoutGtSm: string;

	/** @ignore */
	@Input() public layoutGtXs: string;

	/** @ignore */
	@Input() public layoutLg: string;

	/** @ignore */
	@Input() public layoutMd: string;

	/** @ignore */
	@Input() public layoutPadding: string;

	/** @ignore */
	@Input() public layoutSm: string;

	/** @ignore */
	@Input() public layoutXl: string;

	/** @ignore */
	@Input() public layoutXs: string;

	/** @ignore */
	@Input() public mdBorderBottom: string;

	/** @ignore */
	@Input() public mdDynamicHeight: string;

	/** @ignore */
	@Input() public show: string;

	/** @ignore */
	@Input() public showGtLg: string;

	/** @ignore */
	@Input() public showGtMd: string;

	/** @ignore */
	@Input() public showGtSm: string;

	/** @ignore */
	@Input() public showGtXs: string;

	/** @ignore */
	@Input() public showLg: string;

	/** @ignore */
	@Input() public showMd: string;

	/** @ignore */
	@Input() public showSm: string;

	/** @ignore */
	@Input() public showXl: string;

	/** @ignore */
	@Input() public showXs: string;

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
		super(MdTabs.title, elementRef, injector);
	}
}
