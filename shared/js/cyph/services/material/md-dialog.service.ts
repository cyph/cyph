import {Injectable} from '@angular/core';
import {eventManager} from '../../event-manager';


/**
 * ng2 wrapper for Material1 $mdDialog.
 */
@Injectable()
export class MdDialogService {
	/** @ignore */
	private static $mdDialog	=
		eventManager.one<angular.material.IDialogService>('$mdDialog')
	;

	/** @see angular.material.IDialogService.alert */
	public async alert () : Promise<angular.material.IAlertDialog> {
		return (await MdDialogService.$mdDialog).alert();
	}

	/** @see angular.material.IDialogService.cancel */
	public async cancel (response?: any) : Promise<void> {
		(await MdDialogService.$mdDialog).cancel(response);
	}

	/** @see angular.material.IDialogService.confirm */
	public async confirm () : Promise<angular.material.IConfirmDialog> {
		return (await MdDialogService.$mdDialog).confirm();
	}

	/** @see angular.material.IDialogService.hide */
	public async hide (response?: any) : Promise<any> {
		return (await (await MdDialogService.$mdDialog).hide(response));
	}

	/** @see angular.material.IDialogService.prompt */
	public async prompt () : Promise<angular.material.IPromptDialog> {
		return (await MdDialogService.$mdDialog).prompt();
	}

	/** @see angular.material.IDialogService.show */
	public async show (
		dialog:
			angular.material.IDialogOptions|
			angular.material.IAlertDialog|
			angular.material.IConfirmDialog|
			angular.material.IPromptDialog
	) : Promise<any> {
		return (await (await MdDialogService.$mdDialog).show(dialog));
	}

	constructor () {}
}
