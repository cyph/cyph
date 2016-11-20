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
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';
import {Templates} from '../templates';


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
		controller: class {
			public Cyph: any;
			public ui: any;

			public self: {
				fromEmail: string;
				fromName: string;
				message: string;
				sent: boolean;
				subject: string;
				to: string;
			};

			public send () : void {
				Util.email(this.self);
				this.self.sent	= true;
			}

			constructor ($element: JQuery) { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];

				if (!this.self) {
					this.self	= {
						fromEmail: '',
						fromName: '',
						message: '',
						sent: false,
						subject: '',
						to: ''
					};
				}

				for (let k of [
					'fromEmail',
					'fromName',
					'message',
					'subject',
					'to'
				]) {
					const v	= $element.attr(k);
					if (v) {
						this.self[k]	= v;
					}
				}
			})(); }
		},
		template: Templates.contact
	};


	@Input() self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(Contact.title, elementRef, injector);
	}
}
