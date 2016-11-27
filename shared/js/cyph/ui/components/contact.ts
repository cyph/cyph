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


/**
 * Angular component for contact form UI.
 */
@Directive({
	selector: 'cyph-contact'
})
export class Contact
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphContact';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public ui: any;

			/** @ignore */
			public self: {
				fromEmail: string;
				fromName: string;
				message: string;
				sent: boolean;
				subject: string;
				to: string;
			};

			/** @ignore */
			public send () : void {
				Util.email(this.self);
				this.self.sent	= true;
			}

			constructor ($element: JQuery) { (async () => {
				while (!cyph || !ui) {
					await Util.sleep();
				}

				this.cyph	= cyph;
				this.ui		= ui;
			})(); }
		},
		templateUrl: '../../../../templates/contact.html'
	};


	/** @ignore */
	@Input() public self: {
		fromEmail: string;
		fromName: string;
		message: string;
		to: string;
		sent: boolean;
		subject: string;
	};

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
		super(Contact.title, elementRef, injector);
	}
}
