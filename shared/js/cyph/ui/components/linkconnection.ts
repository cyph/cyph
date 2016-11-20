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
import {Templates} from '../templates';


/**
 * Angular component for link connection.
 */
@Directive({
	selector: 'cyph-link-connection'
})
export class LinkConnection extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphLinkConnection';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: class {
			public Cyph: any;
			public self: ILinkConnection;

			public queuedMessageDraft: string	= '';

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
			})(); }
		},
		template: Templates.linkConnection
	};


	@Input() self: ILinkConnection;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(LinkConnection.title, elementRef, injector);
	}
}
