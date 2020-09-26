import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	ViewChild
} from '@angular/core';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import FileManager from 'devextreme/ui/file_manager';
import {DxFileManagerComponent} from 'devextreme-angular/ui/file-manager';
import {Observable} from 'rxjs';
import {Async} from '../../async-type';
import {BaseProvider} from '../../base-provider';
import {
	IAccountFileDirectory,
	IAccountFileRecord,
	IAccountFileReference
} from '../../proto';
import {StringsService} from '../../services/strings.service';
import {IDataSourceFile} from './interfaces/idata-source-file';
import {IFileManagerDirectory} from './interfaces/ifile-manager-directory';

/**
 * Angular component for file manager UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-file-manager',
	styleUrls: ['./file-manager.component.scss'],
	templateUrl: './file-manager.component.html'
})
export class FileManagerComponent extends BaseProvider implements OnChanges {
	/** @ignore */
	private allData: (IDataSourceFile | IFileManagerDirectory)[] = [];

	/** Callback function to change directory. */
	@Input() public changeDirectory?: (directory: string) => void;

	/** Callback function to create directory. */
	@Input() public createDirectory?: (directory: string) => void;

	/** @see CustomFileSystemProvider */
	public readonly customProvider: CustomFileSystemProvider;

	/** Tree of directories. */
	@Input() public directories?: IAccountFileDirectory;

	/** Callback function to download file. */
	@Input() public downloadAndSave?: (
		id:
			| string
			| IAccountFileRecord
			| Promise<IAccountFileRecord & IAccountFileReference>
			| {
					id: string;
					progress: Observable<number>;
					result: Promise<Uint8Array>;
			  }
	) => {
		progress: Observable<number>;
		result: Promise<void>;
	};

	/** @see DxFileManagerComponent */
	@ViewChild(DxFileManagerComponent, {static: false})
	public fileManager?: DxFileManagerComponent;

	/** List of files. */
	@Input() public files?: IDataSourceFile[];

	/** Callback function to remove directory. */
	@Input() public removeDirectory?: (
		directory: string,
		confirm: boolean
	) => void;

	/** Callback function to remove file. */
	@Input() public removeFile?: (
		id: string | Async<IAccountFileRecord> | undefined,
		confirmAndRedirect: boolean
	) => any;

	/** @ignore */
	private fillDirectories (
		files: IDataSourceFile[],
		directories: IFileManagerDirectory[]
	) : (IFileManagerDirectory | IDataSourceFile)[] {
		const rootFiles: (IFileManagerDirectory | IDataSourceFile)[] = [];

		files.forEach((file: IDataSourceFile) => {
			if (!file.record.parentPath) {
				rootFiles.push(file);
				return;
			}

			this.findDirectory(
				this.getNameFromPath(file.record.parentPath),
				directories
			).items.push(file);
		});

		return [...directories, ...rootFiles];
	}

	/** @ignore */
	private findDirectory (
		name: string,
		dirArr: IFileManagerDirectory[],
		res?: IFileManagerDirectory
	) : any {
		if (!res) {
			res = dirArr.find(el => el.name === name);
			if (res) {
				return res;
			}

			dirArr
				.filter(el => el.isDirectory)
				.forEach(dir => {
					res = this.findDirectory(name, dir.items, res);
				});
		}

		return res;
	}

	/** @ignore */
	private getNameFromPath (path: string) : string {
		const pathArr: string[] = path.split('/');

		return pathArr[pathArr.length - 1];
	}

	/** @ignore */
	private transformDirectories (
		obj: any,
		resultStructure: any[] = []
	) : IFileManagerDirectory[] {
		for (const [key, value] of Object.entries(obj.children)) {
			const filemanagerDirObject: IFileManagerDirectory = {
				id: key,
				isDirectory: true,
				items: [],
				name: key
			};

			resultStructure.push(filemanagerDirObject);

			if (Object.keys((<{children?: any}> value).children).length) {
				this.transformDirectories(value, filemanagerDirObject.items);
			}
		}

		return resultStructure;
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.directories || !this.files) {
			return;
		}

		this.allData = this.fillDirectories(
			this.files,
			this.transformDirectories(this.directories)
		);

		this.fileManager?.instance.refresh();
	}

	/** @see DxFileManagerComponent.onCurrentDirectoryChanged */
	public onCurrentDirectoryChanged (event: {
		component: FileManager;
		directory: FileSystemItem;
		element: HTMLElement;
	}) : void {
		if (event && this.changeDirectory) {
			this.changeDirectory(event.directory.name);
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.customProvider = new CustomFileSystemProvider({
			createDirectory: (
				_PARENT_DIR: FileSystemItem,
				name: string
			) : void => {
				if (!this.createDirectory) {
					return;
				}

				this.createDirectory(name);
			},
			deleteItem: (item: FileSystemItem) : void => {
				if (!this.removeDirectory || !this.removeFile) {
					return;
				}

				if (item.isDirectory) {
					this.removeDirectory(item.path, false);
				}
				else {
					this.removeFile(item.dataItem.originalConfig.id, false);
				}
			},
			downloadItems: (items: FileSystemItem[]) : void => {
				if (!this.downloadAndSave) {
					return;
				}

				this.downloadAndSave(items[0].dataItem.originalConfig.id);
			},
			getItems: async (
				pathInfo: FileSystemItem
			) : Promise<(IDataSourceFile | IFileManagerDirectory)[]> => {
				if (!pathInfo.name) {
					return this.allData;
				}

				return pathInfo.dataItem.items;
			}
		});
	}
}
