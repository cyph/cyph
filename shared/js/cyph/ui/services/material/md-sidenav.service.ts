import {Injectable} from '@angular/core';
import {eventManager} from '../../../event-manager';


/**
 * ng2 wrapper for Material1 $mdSidenav.
 */
@Injectable()
export class MdSidenavService {
	/** @ignore */
	private static $mdSidenav	=
		eventManager.one<angular.material.ISidenavService>('$mdSidenav')
	;

	/** @see angular.material.ISidenavService */
	public async getSidenav (component: string) : Promise<angular.material.ISidenavObject> {
		return (await (await MdSidenavService.$mdSidenav)(component, true));
	}

	constructor () {}
}
