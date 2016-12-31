/**
 * ng2 wrapper for Material1 $mdSidenav.
 */
/* tslint:disable-next-line:no-stateless-class */
export class MdSidenavService {
	/** @ignore */
	public static deps: string[]	= ['$injector'];

	/** @ignore */
	public static provide: string	= 'MdSidenavService';

	/** @ignore */
	public static useFactory ($injector: any) : angular.material.ISidenavService {
		return $injector.get('$mdSidenav');
	}

	constructor () {}
}
