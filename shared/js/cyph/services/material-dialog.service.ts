import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {MatDialog, MatSnackBar} from '@angular/material';
import {SafeUrl} from '@angular/platform-browser';
import {DialogAlertComponent} from '../components/dialog-alert.component';
import {DialogConfirmComponent} from '../components/dialog-confirm.component';
import {DialogImageComponent} from '../components/dialog-image.component';
import {LockFunction} from '../lock-function-type';
import {lockFunction} from '../util/lock';
import {sleep} from '../util/wait';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';


/**
 * DialogService implementation built on Angular Material.
 */
@Injectable()
export class MaterialDialogService implements DialogService {
	/** @ignore */
	private readonly lock: LockFunction	= lockFunction();

	/** @inheritDoc */
	public async alert (o: {content: string; ok?: string; title?: string}) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogAlertComponent);

			matDialogRef.componentInstance.content	= o.content;

			matDialogRef.componentInstance.ok		= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			matDialogRef.componentInstance.title		= o.title !== undefined ?
				o.title :
				''
			;

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		setInputs?: (componentInstance: T) => void
	) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(componentType);

			if (setInputs) {
				setInputs(matDialogRef.componentInstance);
			}

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async confirm (o: {
		cancel?: string;
		content: string;
		ok?: string;
		timeout?: number;
		title?: string;
	}) : Promise<boolean> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogConfirmComponent);

			matDialogRef.componentInstance.content	= o.content;

			matDialogRef.componentInstance.cancel	= o.cancel !== undefined ?
				o.cancel :
				this.stringsService.cancel
			;

			matDialogRef.componentInstance.ok		= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			matDialogRef.componentInstance.title		= o.title !== undefined ?
				o.title :
				''
			;

			const promise	= matDialogRef.afterClosed().toPromise<boolean>();

			let hasReturned	= false;
			if (o.timeout !== undefined && !isNaN(o.timeout)) {
				(async () => {
					await sleep(o.timeout);
					if (!hasReturned) {
						matDialogRef.close(false);
					}
				})();
			}

			try {
				return await promise;
			}
			finally {
				hasReturned	= true;
			}
		});
	}

	/** @inheritDoc */
	public async image (src: SafeUrl|string) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogImageComponent);

			matDialogRef.componentInstance.src	= src;

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async toast (content: string, duration: number) : Promise<void> {
		await this.matSnackbar.open(content, undefined, {duration}).afterDismissed().toPromise();
		await sleep(500);
	}

	constructor (
		/** @ignore */
		private readonly matDialog: MatDialog,

		/** @ignore */
		private readonly matSnackbar: MatSnackBar,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
