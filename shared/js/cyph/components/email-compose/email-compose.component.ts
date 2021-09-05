import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	ViewChild
} from '@angular/core';
import {MatSelect} from '@angular/material/select';
import {
	DocumentEditorContainerComponent,
	ToolbarService
} from '@syncfusion/ej2-angular-documenteditor';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {IFile} from '../../ifile';
import {MaybePromise} from '../../maybe-promise-type';
import {EmailMessage, IEmailMessage} from '../../proto';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {filterUndefined} from '../../util/filter';
import {readableByteLength} from '../../util/formatting';
import {waitForValue} from '../../util/wait';

/**
 * Angular component for email compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ToolbarService],
	selector: 'cyph-email-compose',
	styleUrls: ['./email-compose.component.scss'],
	templateUrl: './email-compose.component.html'
})
export class EmailComposeComponent
	extends BaseProvider
	implements AfterViewInit, OnChanges
{
	/** @see DocumentEditorContainerComponent */
	@ViewChild('documentEditorContainer', {
		read: DocumentEditorContainerComponent
	})
	public documentEditorContainer?: DocumentEditorContainerComponent;

	/** @see IEmailMessage.attachments */
	public readonly attachments = new BehaviorSubject<IFile[]>([]);

	/** Attachments dropdown. */
	@ViewChild('attachmentsDropdown', {read: MatSelect})
	public attachmentsDropdown?: MatSelect;

	/** Queued up attachments to remove. */
	public readonly attachmentsToRemove = new BehaviorSubject<IFile[]>([]);

	/** @see IEmailMessage.bcc */
	public readonly bcc = new BehaviorSubject<EmailMessage.IContact[]>([]);

	/** @see IEmailMessage.cc */
	public readonly cc = new BehaviorSubject<EmailMessage.IContact[]>([]);

	/** @see IEmailMessage.from */
	@Input() public from?: EmailMessage.IContact;

	/** If true, full page mode. */
	@Input() public fullPage: boolean = false;

	/** An initial draft to load. */
	@Input() public initialDraft?: IEmailMessage;

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** If true, read-only mode. */
	@Input() public readOnly: boolean = false;

	/** Indicates whenther email send has been initiated. */
	public readonly sending = new BehaviorSubject<boolean>(false);

	/** Final content to send. */
	@Output() public readonly sentContent = new EventEmitter<IEmailMessage>();

	/** @see DocumentEditorContainerComponent */
	@ViewChild('statusBarUI')
	public statusBarUI?: ElementRef<HTMLDivElement>;

	/** @see IEmailMessage.subject */
	public readonly subject = new BehaviorSubject<string>('');

	/** @see IEmailMessage.to */
	public readonly to = new BehaviorSubject<EmailMessage.IContact[]>([]);

	/** `to` draft value. */
	public readonly toDraft = new BehaviorSubject<string>('');

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @ignore */
	private async onChanges () : Promise<void> {
		const documentEditor = await waitForValue(
			() => this.documentEditorContainer?.documentEditor
		);

		documentEditor.useCtrlClickToFollowHyperlink = !this.readOnly;
	}

	/** Adds a list of recipients to `to`. */
	public async addRecipients (
		recipientsInput: BehaviorSubject<string>,
		recipientsSubject: BehaviorSubject<EmailMessage.IContact[]>
	) : Promise<void> {
		if (!recipientsInput.value) {
			return;
		}

		/* TODO: Factor out this and AccountComposeComponent.addToGroup */
		const parsedInput =
			recipientsInput.value.indexOf('<') < 0 ?
				[
					{
						email: recipientsInput.value.toLowerCase(),
						name: recipientsInput.value
					}
				] :
				recipientsInput.value.split(',').map(s => {
					s = s.trim();
					const parts = s.match(/^"?(.*?)"?\s*<(.*?)>$/) || [];

					return parts[1] && parts[2] ?
						{email: parts[2].toLowerCase(), name: parts[1]} :
						{email: s.toLowerCase(), name: s};
				});

		const newRecipients = await Promise.all(
			parsedInput.map(async contact => {
				try {
					return await this.preprocessRecipient(contact);
				}
				catch {
					return undefined;
				}
			})
		);

		const failures = filterUndefined(
			newRecipients.map((o, i) =>
				o === undefined ? parsedInput[i].email : undefined
			)
		);

		recipientsSubject.next(
			Array.from(
				recipientsSubject.value.concat(filterUndefined(newRecipients))
			)
		);

		recipientsInput.next('');

		if (failures.length < 1) {
			return;
		}

		await this.dialogService.toast(
			this.stringsService.setParameters(
				this.stringsService.emailRecipientAddFailure,
				{recipients: failures.join(', ')}
			),
			-1,
			this.stringsService.ok
		);
	}

	/** Attachments panel open event. */
	public attachmentsPanelOpen () : void {
		this.attachmentsToRemove.next([]);

		/* TODO: Find a better way of doing this */
		document
			.querySelector('.email-compose-attachments-panel')
			?.parentElement?.classList.add('cyph-light-theme');
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		const documentEditorContainer = this.documentEditorContainer;

		if (!documentEditorContainer || !this.from) {
			return;
		}

		documentEditorContainer.setDefaultCharacterFormat({
			fontFamily: 'Arial',
			fontSize: 12
		});

		await this.onChanges();

		const statusBarUI = this.statusBarUI?.nativeElement;
		const statusBar =
			documentEditorContainer.element.querySelector('.e-de-status-bar');

		if (
			!(
				statusBar instanceof HTMLElement &&
				statusBarUI instanceof HTMLElement
			)
		) {
			return;
		}

		for (const child of Array.from(statusBar.children)) {
			if (!(child instanceof HTMLElement)) {
				continue;
			}

			child.style.display = 'none';
		}

		while (statusBarUI.firstChild) {
			statusBar.appendChild(statusBarUI.firstChild);
		}
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.onChanges();
	}

	/** Function to preprocess each new recipient, for example to populate usernames. */
	@Input() public preprocessRecipient = (
		contact: EmailMessage.IContact
	) : MaybePromise<EmailMessage.IContact> => contact;

	/** Removes attachments. */
	public removeAttachments () : void {
		if (this.attachmentsToRemove.value.length < 1) {
			return;
		}

		const attachments = new Set(this.attachments.value);

		for (const attachment of this.attachmentsToRemove.value) {
			attachments.delete(attachment);
		}

		this.attachments.next(Array.from(attachments));
		this.attachmentsToRemove.next([]);
		this.attachmentsDropdown?.close();
	}

	/** Removes a recipient from `to`. */
	public removeRecipient (
		recipient: EmailMessage.IContact,
		recipientsSubject: BehaviorSubject<EmailMessage.IContact[]>
	) : void {
		const recipients = new Set(recipientsSubject.value);

		recipients.delete(recipient);
		recipientsSubject.next(Array.from(recipients));
	}

	/** Send email. */
	public async send () : Promise<void> {
		const documentEditorContainer = this.documentEditorContainer;
		const from = this.from;

		if (!documentEditorContainer || !from) {
			return;
		}

		this.sending.next(true);

		if (
			await this.dialogService.toast(
				this.stringsService.emailSent,
				3000,
				this.stringsService.emailSentUndo
			)
		) {
			this.sending.next(false);
			return;
		}

		this.sentContent.emit({
			attachments: this.attachments.value,
			bcc: this.bcc.value,
			body: potassiumUtil.toString(
				await potassiumUtil.fromBlob(
					await documentEditorContainer.documentEditor.saveAsBlob(
						'Sfdt'
					)
				)
			),
			cc: this.cc.value,
			from,
			subject: this.subject.value,
			to: this.to.value
		});
	}

	constructor (
		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
