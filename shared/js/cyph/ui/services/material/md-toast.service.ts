import {Injectable} from '@angular/core';
import {eventManager} from '../../../event-manager';


/**
 * ng2 wrapper for Material1 $mdToast.
 */
@Injectable()
export class MdToastService {
	/** @ignore */
	private static $mdToast	=
		eventManager.one<angular.material.IToastService>('$mdToast')
	;

	/** @see angular.material.IToastService.build */
	public async build () : Promise<angular.material.IToastPreset<any>> {
		return (await MdToastService.$mdToast).build();
	}

	/** @see angular.material.IToastService.cancel */
	public async cancel (response?: any) : Promise<void> {
		(await MdToastService.$mdToast).cancel(response);
	}

	/** @see angular.material.IToastService.hide */
	public async hide (response?: any) : Promise<any> {
		return (await (await MdToastService.$mdToast).hide(response));
	}

	/** @see angular.material.IToastService.show */
	public async show (
		optionsOrPreset: angular.material.IToastOptions|angular.material.IToastPreset<any>
	) : Promise<any> {
		return (await (await MdToastService.$mdToast).show(optionsOrPreset));
	}

	/** @see angular.material.IToastService.showSimple */
	public async showSimple (content: string) : Promise<any> {
		return (await (await MdToastService.$mdToast).show(content));
	}

	/** @see angular.material.IToastService.simple */
	public async simple () : Promise<angular.material.ISimpleToastPreset> {
		return (await MdToastService.$mdToast).simple();
	}

	/** @see angular.material.IToastService.updateContent */
	public async updateContent (newContent: string) : Promise<void> {
		(await MdToastService.$mdToast).updateContent(newContent);
	}

	/** @see angular.material.IToastService.updateTextContent */
	public async updateTextContent (newContent: string) : Promise<void> {
		(await MdToastService.$mdToast).updateTextContent(newContent);
	}

	constructor () {}
}
