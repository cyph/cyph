import {ChangeDetectionStrategy, Component, Input, ViewChild} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import {DxFileManagerComponent} from 'devextreme-angular';
import {ITransformedData} from './interfaces/transformedData';
import {IDataSource} from './interfaces/dataSource';

// import RemoteFileSystemProvider from "devextreme/file_management/remote_provider";

/**
 * Angular component for file manager UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-file-manager',
	styleUrls: ['./file-manager.component.scss'],
	templateUrl: './file-manager.component.html'
})
export class FileManagerComponent extends BaseProvider {
	@Input() dataSource = [];
	// temp console err fix
	// @ts-ignore
	@ViewChild(DxFileManagerComponent, {static: false}) fileManager: DxFileManagerComponent;

	customProvider: CustomFileSystemProvider;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		const root: this = this;

		this.customProvider = new CustomFileSystemProvider({
			getItems(): ITransformedData[] {
				return root.transformData(root.dataSource);
			}
		});
	}

	ngOnChanges(): void {
		this.fileManager?.instance.refresh();
	}

	transformData(data: IDataSource[]): ITransformedData[] {
		return [...data].map((el: any) => {
			return {
				key: el.record.name,
				name: el.record.name,
				size: el.record.size,
				isDirectory: el.record.mediaType === 'cyph/folder',
			};
		});
	}
}
