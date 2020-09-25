import {ChangeDetectionStrategy, Component, Input, ViewChild} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import {DxFileManagerComponent} from 'devextreme-angular';
import {IFilemanagerDirectory} from './interfaces/filemanagerDirectory';
import {IAccountFileDirectory, IAccountFileRecord, IAccountFileReference} from '../../proto/types';
import {Async} from '../../async-type';
import {Observable} from 'rxjs';
import {IDatasourceFile} from './interfaces/datasourceFile';
import FileManager from "devextreme/ui/file_manager";

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
	private allData: (IDatasourceFile | IFilemanagerDirectory)[] = [];

	@Input() directories?: IAccountFileDirectory[];
	// @ts-ignore
	@Input() createDirectory: (directory: string) => void;
	// @ts-ignore
	@Input() removeDirectory: (directory: string, confirm: boolean) => void;
	// @ts-ignore
	@Input() removeFile: (id: string | Async<IAccountFileRecord> | undefined, confirmAndRedirect: boolean) => any;
	@Input() files?: IDatasourceFile[];
	// @ts-ignore
	@Input() downloadAndSave: (
		id:
			| string
			| IAccountFileRecord
			| Promise<IAccountFileRecord & IAccountFileReference>
			| {
					id: string;
					progress: Observable<number>;
					result: Promise<Uint8Array>;
			}) => {
				progress: Observable<number>;
				result: Promise<void>;
			};

	@ViewChild(DxFileManagerComponent, {static: false}) fileManager?: DxFileManagerComponent;
	// @ts-ignore
	@Input() changeDirectory: (directory: string) => void;

	onCurrentDirectoryChanged(event: {component: FileManager, directory: FileSystemItem, element: HTMLElement}): void {
		if(event) {
			this.changeDirectory(event.directory.name);
		}
	}

	customProvider: CustomFileSystemProvider;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		const root: this = this;

		this.customProvider = new CustomFileSystemProvider({
			getItems(pathInfo: FileSystemItem): Promise<Array<IDatasourceFile | IFilemanagerDirectory>> {
				if(!pathInfo.name) {
					return new Promise((res) => res(root.allData));
				}

				return new Promise((res) => res(pathInfo.dataItem.items))
			},
			// @ts-ignore
			createDirectory(parentDir: FileSystemItem, name: string): void {
				root.createDirectory(name);
			},
			deleteItem(item: FileSystemItem): void {
				if(item.isDirectory) {
					root.removeDirectory(item.path, false);
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
		if(this.directories && this.files) {
			this.allData = this.fillDirectories(this.files, this.transformDirectories(this.directories));
			this.fileManager?.instance.refresh();
		}
	}

	private fillDirectories(
		files: IDatasourceFile[],
		directories: IFilemanagerDirectory[]
	): (IFilemanagerDirectory | IDatasourceFile)[] {
		const rootFiles: (IFilemanagerDirectory | IDatasourceFile)[] = [];

		files.forEach((file: IDatasourceFile) => {
			if(!file.record.parentPath) {
				rootFiles.push(file);
			} else {
				this
					.findDirectory(this.getNameFromPath(file.record.parentPath), directories)
					.items.push(file);
			}
		});

		return [...directories, ...rootFiles];
	}

	private transformDirectories(obj: any, resultStructure: any[] = []): IFilemanagerDirectory[] {
		for(const [key, value] of Object.entries(obj.children)) {
			const filemanagerDirObject: IFilemanagerDirectory = {
				id: key,
				name: key,
				isDirectory: true,
				items: []
			};

			resultStructure.push(filemanagerDirObject);

			if(Object.keys((<{children?:any}>value).children).length) {
				this.transformDirectories(value, filemanagerDirObject.items);
			}
		}

		return resultStructure;
	}
	private findDirectory(name: string, dirArr: IFilemanagerDirectory[], res?: IFilemanagerDirectory): any {
		if(!res) {
			res = dirArr.find(el => el.name === name);
			if(res) {
				return res;
			}

			dirArr.filter(el => el.isDirectory).forEach(dir => {
				res = this.findDirectory(name, dir.items, res);
			});
		}

		return res;
	}

	private getNameFromPath(path: string): string {
		const pathArr: string[] = path.split('/');

		return pathArr[pathArr.length - 1];
	}
}
