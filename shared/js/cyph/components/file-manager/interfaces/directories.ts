export interface IDirectories {
	create(directory: string): void;
	delete(directory: string, confirm: boolean): void;
	transform(currentDirectory: string, directory: string): void;
	watch(parentDirectory?: string, includeRelativeParent?: boolean): any;
}
