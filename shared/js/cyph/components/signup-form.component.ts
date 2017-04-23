import {Component, ElementRef, Input} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../services/env.service';
import {SignupService} from '../services/signup.service';
import {util} from '../util';


/**
 * Angular component for signup form.
 */
@Component({
	selector: 'cyph-signup-form',
	styleUrls: ['../../css/components/signup-form.css'],
	templateUrl: '../../templates/signup-form.html'
})
export class SignupFormComponent {
	/** Indicates whether or not to display invite-code-related UI. */
	@Input() public invite: boolean;

	/** @see SignupService.submit */
	public async submit () : Promise<void> {
		this.signupService.submit();

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

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
		private readonly elementRef: ElementRef,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService
	) {}
}
