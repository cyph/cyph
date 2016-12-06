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
import {Util} from '../../../util';


/**
 * ng2 wrapper for Material1 md-tabs.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'md2-tabs'
})
export class MdTabs
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'md2Tabs';

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
				let $placeholders: JQuery;
				while (!$placeholders || $placeholders.length < 1) {
					$placeholders	= $element.find('div.placeholder');
					await Util.sleep(50);
				}

				let $transclusions: JQuery;
				while (!$transclusions || $transclusions.length < 1) {
					$transclusions	= $element.children('ng-transclude').children();
					await Util.sleep(50);
				}

				$placeholders.eq(0).append($transclusions.eq(0).detach());

				while (!this.labels) {
					await Util.sleep();
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


	/** @ignore */
	@Input() public childClass: string;

	/** @ignore */
	@Input() public labels: string[];

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
