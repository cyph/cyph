import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	Inject,
	Optional,
	ViewChild
} from '@angular/core';
import {MatBottomSheetRef} from '@angular/material/bottom-sheet';
import {MatDialogRef} from '@angular/material/dialog';
import {SafeUrl} from '@angular/platform-browser';
import {BehaviorSubject, Observable} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {IForm} from '../../proto/types';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {sleep} from '../../util/wait';
import {DynamicFormComponent} from '../dynamic-form';

/**
 * Angular component for confirm dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-confirm',
	styleUrls: ['./dialog-confirm.component.scss'],
	templateUrl: './dialog-confirm.component.html'
})
export class DialogConfirmComponent extends BaseProvider
	implements AfterViewInit {
	/** Indicates whether this is a bottom sheet. */
	public bottomSheet: boolean = false;

	/** Cancel button text. */
	public cancel?: string;

	/** Cancel button FAB icon. */
	public cancelFAB?: string;

	/** Content. */
	public content?: string;

	/** @see DynamicFormComponent */
	@ViewChild('dynamicForm', {read: DynamicFormComponent})
	public dynamicForm?: DynamicFormComponent;

	/** Avatar to put in betwen FAB buttons. */
	public fabAvatar?: Observable<SafeUrl | string | undefined>;

	/** Form for prompt. If defined, will render and return response. */
	public form?: IForm;

	/** Indicates whether password field should be hidden (if applicable). */
	public readonly hidePassword = new BehaviorSubject(true);

	/** Indicates whether content is Markdown. */
	public markdown: boolean = false;

	/** List of options to present user. */
	public multipleChoiceOptions?: {
		text?: string;
		title: string;
		value: any;
	}[];

	/** Multiple choice option selection. */
	public multipleChoiceSelection?: any;

	/** OK button text. */
	public ok?: string;

	/** OK button FAB icon. */
	public okFAB?: string;

	/** Indicates whether password UI should be used. */
	public password: boolean = false;

	/** If not undefined, will prompt for input. */
	public prompt?: string;

	/** Prompt placeholder text. */
	public promptPlaceholder?: string;

	/** Title. */
	public title?: string;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Closes dialog. */
	public close (ok?: boolean) : void {
		if (this.matDialogRef) {
			this.matDialogRef.close(ok);
		}
		else if (this.matBottomSheetRef) {
			this.matBottomSheetRef.dismiss(ok);
		}
	}

	/** Alternate UI based around FABs. */
	public get fabMode () : boolean {
		return !!(this.cancelFAB && this.okFAB);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);
		this.changeDetectorRef.markForCheck();
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @ignore */
		@Optional()
		@Inject(MatBottomSheetRef)
		private readonly matBottomSheetRef:
			| MatBottomSheetRef<DialogConfirmComponent>
			| undefined,

		/** @ignore */
		@Optional()
		@Inject(MatDialogRef)
		private readonly matDialogRef:
			| MatDialogRef<DialogConfirmComponent>
			| undefined,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
