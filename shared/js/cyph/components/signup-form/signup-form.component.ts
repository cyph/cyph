import {Component, ElementRef, Input} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../../services/env.service';
import {SignupService} from '../../services/signup.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';


/**
 * Angular component for signup form.
 */
@Component({
	selector: 'cyph-signup-form',
	styleUrls: ['./signup-form.component.scss'],
	templateUrl: './signup-form.component.html'
})
export class SignupFormComponent {
	/** Indicates whether or not to display invite-code-related UI. */
	@Input() public invite: boolean	= false;

	/** @see SignupService.submit */
	public async submit () : Promise<void> {
		this.signupService.submit();

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep();

		const $input: JQuery	= $(this.elementRef.nativeElement).
			find('input:visible:not([disabled])')
		;

		if ($input.length === 1) {
			$input.trigger('focus');
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
