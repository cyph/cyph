import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {ThemePalette} from '@angular/material/core/common-behaviors/color';
import {ProgressSpinnerMode} from '@angular/material/progress-spinner';
import {BaseProvider} from '../../base-provider';

/**
 * Angular component for spinner UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-spinner',
	styleUrls: ['./spinner.component.scss'],
	templateUrl: './spinner.component.html'
})
export class SpinnerComponent extends BaseProvider {
	/** @see MatProgressSpinner.color */
	@Input() public color: ThemePalette;

	/** @see MatProgressSpinner.diameter */
	@Input() public diameter: number | string = 100;

	/** @see MatProgressSpinner.mode */
	@Input() public mode: ProgressSpinnerMode = 'determinate';

	/** @see MatProgressSpinner.strokeWidth */
	@Input() public strokeWidth: number | string = 10;

	/** @see MatProgressSpinner.value */
	@Input() public value: number | string = 0;

	constructor () {
		super();
	}
}
