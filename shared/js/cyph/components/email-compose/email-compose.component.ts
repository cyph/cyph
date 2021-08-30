import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	OnChanges,
	ViewChild
} from '@angular/core';
import {
	DocumentEditorContainerComponent,
	ToolbarService
} from '@syncfusion/ej2-angular-documenteditor';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
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

	/** If true, read-only mode. */
	@Input() public readOnly: boolean = false;

	/** @see DocumentEditorContainerComponent */
	@ViewChild('statusBarUI')
	public statusBarUI?: ElementRef<HTMLDivElement>;

	/** @ignore */
	private async onChanges () : Promise<void> {
		const documentEditor = await waitForValue(
			() => this.documentEditorContainer?.documentEditor
		);

		documentEditor.useCtrlClickToFollowHyperlink = !this.readOnly;
	}

	/** Attachments panel open event. */
	public attachmentsPanelOpen () : void {
		/* TODO: Find a better way of doing this */
		document
			.querySelector('.email-compose-attachments-panel')
			?.parentElement?.classList.add('cyph-light-theme');
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

		/* Temporary test function */
		(<any> self).documentEditorContainer = documentEditorContainer;
		(<any> self).getDocumentEditorContent = async () =>
			potassiumUtil
				.toString(
					await potassiumUtil.fromBlob(
						await documentEditorContainer.documentEditor.saveAsBlob(
							'Sfdt'
						)
					)
				)
				.trim();
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.onChanges();
	}

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
