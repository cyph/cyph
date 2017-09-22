import {Injectable} from '@angular/core';
import {ComponentType, MatDialog, MatSnackBar} from '@angular/material';
import {SafeUrl} from '@angular/platform-browser';
import {DialogAlertComponent} from '../components/dialog-alert.component';
import {DialogConfirmComponent} from '../components/dialog-confirm.component';
import {DialogImageComponent} from '../components/dialog-image.component';
import {LockFunction} from '../lock-function-type';
import {util} from '../util';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';


/**
 * DialogService implementation built on Angular Material.
 */
@Injectable()
export class MaterialDialogService implements DialogService {
	/** @ignore */
	private readonly lock: LockFunction	= util.lockFunction();

	/** @inheritDoc */
	public async alert (o: {content: string; ok?: string; title?: string}) : Promise<void> {
		return this.lock(async () => {
			const mdDialogRef	= this.mdDialog.open(DialogAlertComponent);

			mdDialogRef.componentInstance.content	= o.content;

			mdDialogRef.componentInstance.ok		= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			mdDialogRef.componentInstance.title		= o.title !== undefined ?
				o.title :
				''
			;

			await mdDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		setInputs?: (componentInstance: T) => void
	) : Promise<void> {
		return this.lock(async () => {
			const mdDialogRef	= this.mdDialog.open(componentType);

			if (setInputs) {
				setInputs(mdDialogRef.componentInstance);
			}

			await mdDialogRef.afterClosed().toPromise();
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
			const mdDialogRef	= this.mdDialog.open(DialogConfirmComponent);

			mdDialogRef.componentInstance.content	= o.content;

			mdDialogRef.componentInstance.cancel	= o.cancel !== undefined ?
				o.cancel :
				this.stringsService.cancel
			;

			mdDialogRef.componentInstance.ok		= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			mdDialogRef.componentInstance.title		= o.title !== undefined ?
				o.title :
				''
			;

			const promise	= mdDialogRef.afterClosed().toPromise<boolean>();

			let hasReturned	= false;
			if (o.timeout !== undefined && !isNaN(o.timeout)) {
				(async () => {
					await util.sleep(o.timeout);
					if (!hasReturned) {
						mdDialogRef.close(false);
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
			const mdDialogRef	= this.mdDialog.open(DialogImageComponent);

			mdDialogRef.componentInstance.src	= src;

			await mdDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async toast (content: string, duration: number) : Promise<void> {
		await this.mdSnackbar.open(content, undefined, {duration}).afterDismissed().toPromise();
		await util.sleep(500);
	}

	constructor (
		/** @ignore */
		private readonly mdDialog: MatDialog,

		/** @ignore */
		private readonly mdSnackbar: MatSnackBar,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
