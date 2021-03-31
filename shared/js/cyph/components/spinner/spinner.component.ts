import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	OnInit
} from '@angular/core';
import {ThemePalette} from '@angular/material/core/common-behaviors/color';
import {ProgressSpinnerMode} from '@angular/material/progress-spinner';
import {AnimationOptions} from 'ngx-lottie';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {sleep} from '../../util/wait/sleep';

/**
 * Angular component for spinner UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-spinner',
	styleUrls: ['./spinner.component.scss'],
	templateUrl: './spinner.component.html'
})
export class SpinnerComponent extends BaseProvider
	implements OnChanges, OnInit {
	/** @ignore */
	private indeterminateValueLoopInProgress: boolean = false;

	/** Indicates whether the default Material indeterminate spinner will be used. */
	public readonly classicIndeterminateSpinner: boolean = true;

	/** @see AnimationOptions */
	public readonly castle: AnimationOptions = {
		path: '/assets/lottie/castle.json'
	};

	/** @see AnimationOptions */
	public readonly castleDark: AnimationOptions = {
		path: '/assets/lottie/castle-dark.json'
	};

	/** @see AnimationOptions */
	public readonly cloud: AnimationOptions = {
		path: '/assets/lottie/cloud.json'
	};

	/** @see MatProgressSpinner.color */
	@Input() public color: ThemePalette;

	/** @see MatProgressSpinner.diameter */
	@Input() public diameter: number | string = 100;

	/** Value of spinner in indeterminate mode. */
	public readonly indeterminateValue = new BehaviorSubject<number>(0);

	/** @see MatProgressSpinner.mode */
	@Input() public mode: ProgressSpinnerMode = 'determinate';

	/** String to select spinner animation. */
	@Input() public readonly spinner?: 'castle' | 'castleDark' | 'cloud';

	/** @see MatProgressSpinner.strokeWidth */
	@Input() public strokeWidth: number | string = 10;

	/** @see MatProgressSpinner.value */
	@Input() public value: number | string = 0;

	/** Indicates whether this spinner is indeterminate. */
	public get indeterminate () : boolean {
		return this.mode === 'indeterminate';
	}

	/** @ignore */
	private async onChanges () : Promise<void> {
		if (
			this.classicIndeterminateSpinner ||
			this.indeterminateValueLoopInProgress
		) {
			return;
		}

		while (this.indeterminate && !this.destroyed.value) {
			this.indeterminateValueLoopInProgress = true;

			for (const n of [20, 40, 60, 80, 100, 80, 60, 40, 20, 0]) {
				this.indeterminateValue.next(n);
				await sleep(1500);
			}
		}

		this.indeterminateValueLoopInProgress = false;
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.onChanges();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.onChanges();
	}

	constructor () {
		super();
	}
}
