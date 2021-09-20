import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	OnChanges,
	ViewChild
} from '@angular/core';
import {DocumentEditorContainerComponent} from '@syncfusion/ej2-angular-documenteditor';
import {MatSelect} from '@angular/material/select';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {IFile} from '../../ifile';
import {IEmailMessage} from '../../proto';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {filterUndefined} from '../../util/filter';
import {readableByteLength} from '../../util/formatting';
import {saveFile} from '../../util/save-file';
import {getDateTimeString} from '../../util/time';
import {waitForValue} from '../../util/wait';

/**
 * Angular component for email view UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-email-view',
	styleUrls: ['./email-view.component.scss'],
	templateUrl: './email-view.component.html'
})
export class EmailViewComponent
	extends BaseProvider
	implements AfterViewInit, OnChanges
{
	/** Attachments dropdown. */
	@ViewChild('attachmentsDropdown', {read: MatSelect})
	public attachmentsDropdown?: MatSelect;

	/** Queued up attachments to download. */
	public readonly attachmentsToDownload = new BehaviorSubject<IFile[]>([]);

	/** @see DocumentEditorContainerComponent */
	@ViewChild('documentEditorContainer', {
		read: DocumentEditorContainerComponent
	})
	public documentEditorContainer?: DocumentEditorContainerComponent;

	/** If true, full page mode. */
	@Input() public fullPage: boolean = false;

	/** Email to display. */
	@Input() public email?: IEmailMessage;

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** Recipient summary data. */
	public readonly recipientSummary = new BehaviorSubject({
		allVerified: true,
		text: ''
	});

	/** @see DocumentEditorContainerComponent */
	@ViewChild('statusBarUI')
	public statusBarUI?: ElementRef<HTMLDivElement>;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @ignore */
	private async onChanges () : Promise<void> {
		const {body, to} = this.email || {};
		if (!body) {
			return;
		}

		const fullText = to ?
			filterUndefined(
				to.map(o => o.name.split(' ')[0] || undefined)
			).join(', ') :
			'';

		this.recipientSummary.next({
			allVerified: (to || [])
				.map(o => !!o.verified)
				.reduce((a, b) => a && b, true),
			text:
				fullText.length > 50 ? `${fullText.slice(0, 50)}...` : fullText
		});

		const documentEditor = await waitForValue(
			() => this.documentEditorContainer?.documentEditor
		);

		documentEditor.open(body);
		documentEditor.useCtrlClickToFollowHyperlink = false;
	}

	/** Attachments panel open event. */
	public attachmentsPanelOpen () : void {
		this.attachmentsToDownload.next([]);

		/* TODO: Find a better way of doing this */
		document
			.querySelector('.email-view-attachments-panel')
			?.parentElement?.classList.add('cyph-light-theme');
	}

	/** Downloads attachments. */
	public async downloadAttachments () : Promise<void> {
		if (this.attachmentsToDownload.value.length < 1) {
			return;
		}

		for (const attachment of this.attachmentsToDownload.value) {
			await saveFile(
				attachment.data,
				attachment.name,
				attachment.mediaType
			);
		}

		this.attachmentsToDownload.next([]);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		const documentEditorContainer = this.documentEditorContainer;

		if (!documentEditorContainer) {
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
