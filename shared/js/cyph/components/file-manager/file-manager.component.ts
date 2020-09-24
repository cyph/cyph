import {ChangeDetectionStrategy, Component, Input, ViewChild} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import {DxFileManagerComponent} from 'devextreme-angular';
import {IDirectories} from './interfaces/directories';
import {IFilemanagerDirectory} from './interfaces/filemanagerDirectory';
import {IFilemanagerFile} from './interfaces/filemanagerFile';

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
	private allData: (IFilemanagerFile | IFilemanagerDirectory)[] = [];

	// @ts-ignore
	@Input() directories: IDirectories;
	@Input() removeFile: any;
	@Input() files: any;
	@Input() downloadAndSave: any;

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
			getItems(pathInfo: FileSystemItem): Promise<Array<IFilemanagerFile | IFilemanagerDirectory>> {
				if(!pathInfo.name) {
					return new Promise((res) => res(root.allData));
				}

				return new Promise((res) => res(pathInfo.dataItem.items))
			},
			// @ts-ignore
			createDirectory(parentDir: FileSystemItem, name: string): void {
				root.directories.create(name);
			},
			deleteItem(item: FileSystemItem): void {
				if(item.isDirectory) {
					root.directories.delete(item.name, false);
				} else {
					root.removeFile(item.dataItem.originalConfig.id, false);
				}
			},
			downloadItems(items: Array<FileSystemItem>): void {
				root.downloadAndSave(items[0].dataItem.originalConfig.id);
			}
		});
	}

	ngOnChanges(): void {
		const root: this = this;

		this.directories.watch().subscribe({
			next(dirs: string[]): void {
				root.files.list().subscribe({
					next(files: any): void {
						root.allData = root.generateFilemanagerData(dirs, files);
						root.fileManager?.instance.refresh();
					}
				});
			}
		});

	}

	private generateFilemanagerData(directories: string[], files: any): (IFilemanagerFile | IFilemanagerDirectory)[] {
		const result: any[] = [];

		directories.forEach((dir: string) => {
			const dirItem: IFilemanagerDirectory = {
				id: dir,
				name: dir,
				isDirectory: true,
				items: []
			};

			result.push(dirItem);
		});

		files.forEach((file: any) => {
			const fileItem : IFilemanagerFile = {
				key: file.record.name,
				name: file.record.name,
				size: file.record.size,
				isDirectory: false,
				originalConfig: file
			};

			if(file.parentPath) {
				const dirItem: IFilemanagerDirectory = result.find((dir: IFilemanagerDirectory) => dir.name === file.parentPath);

				dirItem.items.push(fileItem);
			} else {
				result.push(fileItem);
			}
		});

		return result;

	}
}
