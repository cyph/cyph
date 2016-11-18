import {ILinkConnection} from '../ilinkconnection';
import {Templates} from '../templates';
import {Util} from '../../util';
import {UpgradeComponent} from '@angular/upgrade/static';
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
		template: Templates.linkConnection,
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
		}
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
