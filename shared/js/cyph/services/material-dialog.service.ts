import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SafeUrl} from '@angular/platform-browser';
import {map} from 'rxjs/operators';
import {DialogAlertComponent} from '../components/dialog-alert';
import {DialogConfirmComponent} from '../components/dialog-confirm';
import {DialogImageComponent} from '../components/dialog-image';
import {DialogVideoComponent} from '../components/dialog-video';
import {IResolvable} from '../iresolvable';
import {LockFunction} from '../lock-function-type';
import {lockFunction} from '../util/lock';
import {resolvable, sleep} from '../util/wait';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';


/**
 * DialogService implementation built on Angular Material.
 */
@Injectable()
export class MaterialDialogService implements DialogService {
	/** @ignore */
	private readonly lock: LockFunction	= lockFunction();

	/** @ignore */
	private async confirmHelper (
		o: {
			cancel?: string;
			content: string;
			ok?: string;
			markdown?: boolean;
			placeholder?: string;
			timeout?: number;
			title?: string;
		},
		closeFunction?: IResolvable<() => void>,
		prompt: boolean = false
	) : Promise<{ok: boolean; promptResponse: string|undefined}> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogConfirmComponent);

			matDialogRef.componentInstance.content				= o.content;

			matDialogRef.componentInstance.cancel				= o.cancel !== undefined ?
				o.cancel :
				this.stringsService.cancel
			;

			matDialogRef.componentInstance.markdown				= !!o.markdown;

			matDialogRef.componentInstance.ok					= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			matDialogRef.componentInstance.prompt				= prompt ? '' : undefined;

			matDialogRef.componentInstance.promptPlaceholder	= o.placeholder;

			matDialogRef.componentInstance.title				= o.title !== undefined ?
				o.title :
				''
			;

			if (closeFunction) {
				closeFunction.resolve(() => { matDialogRef.close(); });
			}

			const ok				= matDialogRef.afterClosed().toPromise<boolean>();

			const promptResponse	= matDialogRef.beforeClose().toPromise().then(() =>
				matDialogRef.componentInstance.prompt
			);

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
				return {
					ok: await ok,
					promptResponse: await promptResponse
				};
			}
			finally {
				hasReturned	= true;
			}
		});
	}

	/** @inheritDoc */
	public async alert (
		o: {content: string; markdown?: boolean; ok?: string; title?: string},
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogAlertComponent);

			matDialogRef.componentInstance.content	= o.content;

			matDialogRef.componentInstance.markdown	= !!o.markdown;

			matDialogRef.componentInstance.ok		= o.ok !== undefined ?
				o.ok :
				this.stringsService.ok
			;

			matDialogRef.componentInstance.title	= o.title !== undefined ?
				o.title :
				''
			;

			if (closeFunction) {
				closeFunction.resolve(() => { matDialogRef.close(); });
			}

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		setInputs?: (componentInstance: T) => void,
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(componentType);

			if (closeFunction) {
				closeFunction.resolve(() => { matDialogRef.close(); });
			}

			if (setInputs) {
				setInputs(matDialogRef.componentInstance);
			}

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async confirm (
		o: {
			cancel?: string;
			content: string;
			markdown?: boolean;
			ok?: string;
			timeout?: number;
			title?: string;
		},
		closeFunction?: IResolvable<() => void>
	) : Promise<boolean> {
		return (await this.confirmHelper(o, closeFunction)).ok;
	}

	/** @inheritDoc */
	public async cropImage (o: {
		aspectRatio?: number;
		src: SafeUrl|string;
		title?: string;
	}) : Promise<SafeUrl|undefined> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogImageComponent);
			const cropResult	= resolvable<SafeUrl|undefined>();

			matDialogRef.componentInstance.cropAspectRatio	= o.aspectRatio;
			matDialogRef.componentInstance.cropResult		= cropResult;
			matDialogRef.componentInstance.src				= o.src;
			matDialogRef.componentInstance.title			= o.title;

			return Promise.race([
				cropResult.promise,
				matDialogRef.afterClosed().toPromise()
			]);
		});
	}

	/** @inheritDoc */
	public async dismissToast () : Promise<void> {
		this.matSnackbar.dismiss();
	}

	/** @inheritDoc */
	public async image (
		o: {src: SafeUrl|string; title?: string},
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogImageComponent);

			matDialogRef.componentInstance.src		= o.src;
			matDialogRef.componentInstance.title	= o.title;

			if (closeFunction) {
				closeFunction.resolve(() => { matDialogRef.close(); });
			}

			await matDialogRef.afterClosed().toPromise();
		});
	}

	/** @inheritDoc */
	public async prompt (
		o: {
			cancel?: string;
			content: string;
			markdown?: boolean;
			ok?: string;
			placeholder?: string;
			timeout?: number;
			title?: string;
		},
		closeFunction?: IResolvable<() => void>
	) : Promise<string|undefined> {
		const {ok, promptResponse}	= await this.confirmHelper(o, closeFunction, true);
		return ok ? promptResponse : undefined;
	}

	/** @inheritDoc */
	public async toast (content: string, duration: number, action?: string) : Promise<boolean> {
		const snackbar				= this.matSnackbar.open(
			content,
			action === undefined ? undefined : action.toUpperCase(),
			{duration}
		);

		const wasManuallyDismissed	=
			(await snackbar.onAction().pipe(map(() => true)).toPromise()) || false
		;

		if (wasManuallyDismissed) {
			return true;
		}
		else {
			await sleep(500);
			return false;
		}
	}

	/** @inheritDoc */
	public async video (
		o: {src: SafeUrl|string; title?: string},
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		return this.lock(async () => {
			const matDialogRef	= this.matDialog.open(DialogVideoComponent);

			matDialogRef.componentInstance.src		= o.src;
			matDialogRef.componentInstance.title	= o.title;

			if (closeFunction) {
				closeFunction.resolve(() => { matDialogRef.close(); });
			}

			await matDialogRef.afterClosed().toPromise();
		});
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
