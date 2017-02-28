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
import {util} from '../../util';


/**
 * ng2 wrapper for Material1 md-tabs.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-tabs'
})
/* tslint:disable-next-line:directive-class-suffix */
export class MdTabsComponent
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			childClass: '@',
			labels: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public readonly childClass: string;

			/** @ignore */
			public readonly labels: string[];

			constructor ($element: JQuery) { (async () => {
				const $placeholders	= await util.waitForIterable(
					() => $element.find('div.placeholder')
				);

				const $transclusions	= await util.waitForIterable(
					() => $element.children('ng-transclude').children()
				);

				$placeholders.eq(0).append($transclusions.eq(0).detach());

				while (!this.labels) {
					await util.sleep();
				}

				for (let i = 1 ; i < this.labels.length ; ++i) {
					$placeholders.eq(i).append($transclusions.eq(i).detach());
				}
			})(); }
		},
		template: `
			<md-tabs
				md-border-bottom
				md-dynamic-height
				md-selected='$ctrl.selected'
				ng-class='$ctrl.childClass'
			>
				<md-tab
					ng-repeat='label in $ctrl.labels'
					ng-attr-label='{{label}}'
				>
					<div class='placeholder'></div>
				</md-tab>
			</md-tabs>
			<ng-transclude style='display: none'></ng-transclude>
		`,
		transclude: true
	};

	/** Component title. */
	public static readonly title: string	= 'md2Tabs';


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public labels: string[];

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
		super(MdTabsComponent.title, elementRef, injector);
	}
}
