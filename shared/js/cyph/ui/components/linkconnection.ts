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
import {Util} from '../../util';
import {ILinkConnection} from '../ilinkconnection';


/**
 * Angular component for link connection.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'cyph-link-connection'
})
export class LinkConnection
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static readonly title: string	= 'cyphLinkConnection';

	/** Component configuration. */
	public static readonly config			= {
		bindings: {
			enableAdvancedFeatures: '<',
			self: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public readonly self: ILinkConnection;

			/** @ignore */
			public readonly enableAdvancedFeatures: boolean	= false;

			/** @ignore */
			public readonly queuedMessageDraft: string		= '';

			constructor () { (async () => {
				while (!cyph) {
					await Util.sleep();
				}

				this.cyph	= cyph;
			})(); }
		},
		templateUrl: '../../../../templates/linkconnection.html'
	};


	/** @ignore */
	@Input() public self: ILinkConnection;

	/** @ignore */
	@Input() public enableAdvancedFeatures: boolean;

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
		super(LinkConnection.title, elementRef, injector);
	}
}
