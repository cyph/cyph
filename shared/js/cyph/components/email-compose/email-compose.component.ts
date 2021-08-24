import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
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

	/** @ignore */
	private async onChanges () : Promise<void> {
		const documentEditor = await waitForValue(
			() => this.documentEditorContainer?.documentEditor
		);

		documentEditor.useCtrlClickToFollowHyperlink = !this.readOnly;
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
