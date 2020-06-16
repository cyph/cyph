import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output,
	ViewChild
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for PIN input UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: PinInputComponent
		}
	],
	selector: 'cyph-pin-input',
	styleUrls: ['./pin-input.component.scss'],
	templateUrl: './pin-input.component.html'
})
export class PinInputComponent extends BaseProvider
	implements ControlValueAccessor, OnInit {
	/** Change event callback. */
	private onChange?: (s: string) => void;

	/** Indicates whether input should autofocus. */
	@Input() public autofocus: boolean = false;

	/** Emits when a full PIN is entered. */
	@Output() public readonly entered = new EventEmitter<void>();

	/** Hide PIN. */
	@Input() public hide = new BehaviorSubject<boolean>(true);

	/** Indicates whether input is disabled. */
	public readonly isDisabled = new BehaviorSubject<boolean>(false);

	/** Input. */
	@ViewChild('pinInput') public pinInput?: ElementRef;

	/** Form name. */
	@Input() public name: string = '';

	/** Touch event callback. */
	public onTouched?: () => void;

	/** Pattern string. */
	@Input() public pattern: string = '\\d\\d\\d\\d';

	/** Placeholder text. */
	@Input() public placeholder: string = this.stringsService.pin;

	/** Removes extraneous characters from value. */
	public readonly processValue = memoize((value?: string) =>
		value ? value.replace(/[^\d]/g, '').slice(0, 4) : ''
	);

	/** Indicates whether input is required. */
	@Input() public required: boolean = false;

	/** PIN value. */
	public readonly value: BehaviorSubject<string> = new BehaviorSubject('');

	/** @inheritDoc */
	public ngOnInit () : void {
		this.subscriptions.push(
			this.value.subscribe(s => {
				s = (s || '').trim();

				if (this.onChange) {
					this.onChange(s);
				}

				if (s.length === 4) {
					this.entered.emit();
				}

				if (!this.pinInput?.nativeElement) {
					return;
				}

				const input = <HTMLInputElement> this.pinInput.nativeElement;
				input.value = '';
				input.value = s;
			})
		);
	}

	/** @inheritDoc */
	public registerOnChange (f: (s: string) => void) : void {
		this.onChange = f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched = f;
	}

	/** @inheritDoc */
	public setDisabledState (b: boolean) : void {
		this.isDisabled.next(b);
	}

	/** @inheritDoc */
	public writeValue (s: string) : void {
		if (this.value.value !== s) {
			this.value.next(s);
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
