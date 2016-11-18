import {ISignupForm} from '../isignupform';
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
 * Angular component for signup form.
 */
@Directive({
	selector: 'cyph-signup-form'
})
export class SignupForm extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphSignupForm';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<',
			invite: '<'
		},
		template: Templates.signupForm,
		transclude: true,
		controller: class {
			public Cyph: any;
			public self: ISignupForm;
			public invite: string;

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
			})(); }
		}
	};


	@Input() self: ISignupForm;
	@Input() invite: string;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(SignupForm.title, elementRef, injector);
	}
}
