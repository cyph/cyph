import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	ViewChild
} from '@angular/core';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import FileManager from 'devextreme/ui/file_manager';
import {DxFileManagerComponent} from 'devextreme-angular/ui/file-manager';
import {BaseProvider} from '../../base-provider';
import {IAccountFileDirectory} from '../../proto';
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

	/** Change directory event (emits directory name). */
	@Output() public readonly changeDirectory = new EventEmitter<string>();

	/** Create directory event (emits directory name). */
	@Output() public readonly createDirectory = new EventEmitter<string>();

	/** @see CustomFileSystemProvider */
	public readonly customProvider: CustomFileSystemProvider;

	/** Tree of directories. */
	@Input() public directories?: IAccountFileDirectory;

	/** Download file event. */
	@Output() public readonly downloadAndSave = new EventEmitter<
		FileSystemItem
	>();

	/** @see DxFileManagerComponent */
	@ViewChild('fileManager', {read: DxFileManagerComponent})
	public fileManager?: DxFileManagerComponent;

	/** List of files. */
	@Input() public files?: IDataSourceFile[];

	/** Remove directory event (emits directory name). */
	@Output() public readonly removeDirectory = new EventEmitter<string>();

	/** Remove file event. */
	@Output() public readonly removeFile = new EventEmitter<
		FileSystemItem | string
	>();

	/** Upload file event. */
	@Output() public readonly uploadFile = new EventEmitter<File>();

	/** Share file event. */
	@Output() public readonly shareFile = new EventEmitter<FileSystemItem>();

	/** Share file button click handler */
	public shareFileClick = () : void => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (let file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.shareFile.emit(file.dataItem);
		}
	};

	/** Share file as public link event. */
	@Output() shareDownloadLink = new EventEmitter<FileSystemItem>();

	/** Share files as public link button click handler. */
	public shareDownloadLinkClick = () : void => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (let file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.shareDownloadLink.emit(file);
		}
	};
	/** Revoke publick link event. */
	@Output() revokeDownloadLink = new EventEmitter<FileSystemItem>();

	/** Revoke publick link button click handler. */
	@Output() revokeLinkClick = () => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (let file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.revokeDownloadLink.emit(file);
		}
	};

	/** @ignore */
	private fillDirectories (
		files: IDataSourceFile[],
		directories: IFileManagerDirectory[]
	) : (IFileManagerDirectory | IDataSourceFile)[] {
		const rootFiles: (IFileManagerDirectory | IDataSourceFile)[] = [];

		for (const file of files) {
			if (!file.record.parentPath) {
				rootFiles.push(file);
				continue;
			}

			this.findDirectory(file.record.parentPath, directories)?.items.push(
				file
			);
		}

		return [...directories, ...rootFiles];
	}

	/** @ignore */
	private findDirectory (
		name: string,
		dirArr: IFileManagerDirectory[]
	) : IFileManagerDirectory | undefined {
		const nameArr: string[] = name.split('/');
		let curDir: IFileManagerDirectory | undefined;

		while (nameArr.length) {
			const dirName: string | undefined = nameArr.shift();

			if (!curDir) {
				curDir = dirArr.find(el => el.isDirectory && el.id === dirName);
			}
			else {
				curDir = <IFileManagerDirectory | undefined> (
					curDir.items.find(el => el.isDirectory && el.id === dirName)
				);
			}
		}

		return curDir;
	}

	/** @ignore */
	private transformDirectories (
		directories: IAccountFileDirectory,
		resultStructure: IFileManagerDirectory[] = []
	) : IFileManagerDirectory[] {
		for (const [key, value] of Object.entries(directories.children || {})) {
			const filemanagerDirObject = {
				id: key,
				isDirectory: true,
				items: <IFileManagerDirectory[]> [],
				name: key
			};

			resultStructure.push(filemanagerDirObject);

			if (Object.keys(value.children || {}).length > 0) {
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
		if (event) {
			this.changeDirectory.emit(event.directory.path);
		}
	}

	/** @see DxFileManagerComponent.onSelectedFileOpened */
	public onSelectedFileOpened (_EVENT: unknown) : void {}

	/** @see DxFileManagerComponent.onSelectionChanged */
	public onSelectionChanged (_EVENT: unknown) : void {}

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
				this.createDirectory.emit(name);
			},
			deleteItem: (item: FileSystemItem) : void => {
				if (item.isDirectory) {
					this.removeDirectory.emit(item.path);
					const relatedFiles =
						this.files?.filter(
							el => el.record.parentPath?.indexOf(item.path) === 0
						) || [];

					for (const file of relatedFiles) {
						this.removeFile.emit(file.record.id);
					}
				}
				else {
					this.removeFile.emit(item.dataItem.id);
				}
			},
			downloadItems: (items: FileSystemItem[]) : void => {
				for (const item of items) {
					this.downloadAndSave.emit(item);
				}
			},
			getItems: async (
				pathInfo: FileSystemItem
			) : Promise<(IDataSourceFile | IFileManagerDirectory)[]> => {
				if (!pathInfo.name) {
					return this.allData;
				}

				return pathInfo.dataItem.items;
			},
			uploadFileChunk: (fileData: File) => {
				this.uploadFile.emit(fileData);
			}
		});
	}
}
