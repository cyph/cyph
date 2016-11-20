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
import {ISignupForm} from '../isignupform';
import {Templates} from '../templates';


/**
 * Angular component for signup form.
 */
@Directive({
	selector: 'cyph-signup-form'
})
export class SignupForm
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphSignupForm';

	/** Component configuration. */
	public static config		= {
		bindings: {
			invite: '<',
			self: '<'
		},
		controller: class {
			/** @ignore */
			public Cyph: any;

			/** @ignore */
			public self: ISignupForm;

			/** @ignore */
			public invite: string;

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];
			})(); }
		},
		template: Templates.signupForm,
		transclude: true
	};


	/** @ignore */
	@Input() public self: ISignupForm;

	/** @ignore */
	@Input() public invite: string;

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
		super(SignupForm.title, elementRef, injector);
	}
}
