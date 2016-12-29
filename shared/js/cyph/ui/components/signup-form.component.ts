import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {Env, env} from '../../env';
import {util} from '../../util';
import {SignupService} from '../services/signup.service';


/**
 * Angular component for signup form.
 */
@Component({
	selector: 'cyph-signup-form',
	templateUrl: '../../../../templates/signup-form.html'
})
export class SignupFormComponent implements OnInit {
	/** Indicates whether or not to display invite-code-related UI. */
	@Input() public invite: boolean;

	/** @see Env */
	public readonly env: Env	= env;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await util.sleep(500);
		$(this.elementRef.nativeElement).addClass('visible');
	}

	/** @see SignupService.submit */
	public async submit () : Promise<void> {
		this.signupService.submit();

		await util.sleep();

		const $input: JQuery	= $(this.elementRef.nativeElement).
			find('input:visible:not([disabled])')
		;

		if ($input.length === 1) {
			$input.focus();
		}
	}

	constructor (
		/** @ignore */
		private elementRef: ElementRef,

		/** @see SignupService */
		public signupService: SignupService
	) {}
}
