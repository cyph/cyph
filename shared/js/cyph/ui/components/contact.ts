import {Templates} from '../templates';
import {Config} from '../../config';
import {Env} from '../../env';
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
 * Angular component for contact form UI.
 */
@Directive({
	selector: 'cyph-contact'
})
export class Contact extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphContact';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: Contact,
		template: Templates.contact
	};


	public Cyph: any;
	public ui: any;

	@Input() self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

	public send () : void {
		Util.email(this.self);
		this.self.sent	= true;
	}

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(Contact.title, elementRef, injector);

		(async () => {
			while (!self['Cyph'] || !self['ui']) {
				await Util.sleep(100);
			}

			this.Cyph	= self['Cyph'];
			this.ui		= self['ui'];

			const $elementRef	= $(elementRef);

			if (!this.self) {
				this.self	= {
					fromEmail: '',
					fromName: '',
					message: '',
					to: '',
					sent: false,
					subject: ''
				};
			}

			for (let k of ['fromEmail', 'fromName', 'to', 'subject', 'message']) {
				const v	= $elementRef.attr(k);
				if (v) {
					this.self[k]	= v;
				}
			}
		})();
	}
}
