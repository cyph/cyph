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
import {DxFileManagerComponent} from 'devextreme-angular/ui/file-manager';
import {BehaviorSubject, Observable, of} from 'rxjs';
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

	/** Current selection. */
	@Output() public readonly currentSelection = new BehaviorSubject<
		FileSystemItem[]
	>([]);

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

	/** Download file event. */
	@Output() public readonly moveFile = new EventEmitter<{
		copy?: boolean;
		destinationPath: string;
		file: FileSystemItem;
	}>();

	/** Remove directory event (emits directory name). */
	@Output() public readonly removeDirectory = new EventEmitter<string>();

	/** Remove file event. */
	@Output() public readonly removeFile = new EventEmitter<string>();

	/** Revoke publick link event. */
	@Output() public readonly revokeDownloadLink = new EventEmitter<
		FileSystemItem
	>();

	/** Open selected file event. */
	@Output() public readonly selectedFileOpen = new EventEmitter<
		FileSystemItem
	>();

	/** Change selection event. */
	@Output() public readonly selectionChange = new EventEmitter<
		FileSystemItem[]
	>();

	/** Share file as public link event. */
	@Output() public readonly shareDownloadLink = new EventEmitter<
		FileSystemItem
	>();

	/** Share file event. */
	@Output() public readonly shareFile = new EventEmitter<IDataSourceFile>();

	/** Upload file event. */
	@Output() public readonly uploadFile = new EventEmitter<File>();

	/** @ignore */
	private fillDirectories (
		files: IDataSourceFile[],
		directories: IFileManagerDirectory[]
	) : (IFileManagerDirectory | IDataSourceFile)[] {
		const rootFiles: (IFileManagerDirectory | IDataSourceFile)[] = [];

		for (const file of files.map(o => ({
			...o,
			dateModified: new Date(o.record.timestamp)
		}))) {
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
				continue;
			}

			curDir = <IFileManagerDirectory | undefined> (
				curDir.items.find(
					el =>
						'isDirectory' in el &&
						el.isDirectory &&
						el.id === dirName
				)
			);
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

	/** Function to check if a file has a link shared. */
	@Input() public checkIfLinkShared: (
		downloadID: string
	) => Observable<boolean> = _DOWNLOAD_ID => of(false);

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
	public onCurrentDirectoryChanged (event?: {
		directory?: FileSystemItem;
	}) : void {
		if (event?.directory) {
			this.changeDirectory.emit(event.directory.path);
		}
	}

	/** @see DxFileManagerComponent.onSelectedFileOpened */
	public onSelectedFileOpened (event?: {file?: FileSystemItem}) : void {
		if (event?.file) {
			this.selectedFileOpen.emit(event.file);
		}
	}

	/** @see DxFileManagerComponent.onSelectionChanged */
	public onSelectionChanged (event?: {
		selectedItems?: FileSystemItem[];
	}) : void {
		this.currentSelection.next(event?.selectedItems || []);
		this.selectionChange.emit(this.currentSelection.value);
	}

	/** Revoke publick link button click handler. */
	public readonly revokeDownloadLinkClick = () => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (const file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.revokeDownloadLink.emit(file);
		}
	};

	/** Share files as public link button click handler. */
	public readonly shareDownloadLinkClick = () : void => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (const file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.shareDownloadLink.emit(file);
		}
	};

	/** Share file button click handler. */
	public readonly shareFileClick = () : void => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		for (const file of files) {
			if (file.isDirectory) {
				continue;
			}

			this.shareFile.emit(file.dataItem);
		}
	};

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.customProvider = new CustomFileSystemProvider({
			copyItem: (item, destinationDirectory) => {
				this.moveFile.emit({
					copy: true,
					destinationPath: `${destinationDirectory.path}/${item.name}`,
					file: item
				});
			},
			createDirectory: (_PARENT_DIR, name) => {
				this.createDirectory.emit(name);
			},
			deleteItem: item => {
				if (!item.isDirectory) {
					this.removeFile.emit(item.dataItem.id);
					return;
				}

				this.removeDirectory.emit(item.path);

				const relatedFiles =
					this.files?.filter(
						el => el.record.parentPath?.indexOf(item.path) === 0
					) || [];

				for (const file of relatedFiles) {
					this.removeFile.emit(file.record.id);
				}
			},
			downloadItems: items => {
				for (const item of items) {
					this.downloadAndSave.emit(item);
				}
			},
			getItems: async (
				pathInfo
			) : Promise<(IDataSourceFile | IFileManagerDirectory)[]> => {
				if (!pathInfo.name) {
					return this.allData;
				}

				return pathInfo.dataItem.items;
			},
			moveItem: (item, destinationDirectory) => {
				this.moveFile.emit({
					destinationPath: `${destinationDirectory.path}/${item.name}`,
					file: item
				});
			},
			renameItem: (item, newName) => {
				this.moveFile.emit({
					destinationPath: `${item.pathKeys
						.slice(0, -1)
						.join('')}/${newName}`,
					file: item
				});
			},
			uploadFileChunk: (fileData: File) => {
				this.uploadFile.emit(fileData);
			}
		});
	}
}
