/**
 * ng2 wrapper for Material1 $mdToast.
 */
/* tslint:disable-next-line:no-stateless-class */
export class MdToastService {
	/** @ignore */
	public static deps: string[]	= ['$injector'];

	/** @ignore */
	public static provide: string	= 'MdToastService';

	/** @ignore */
	public static useFactory ($injector: any) : angular.material.IToastService {
		return $injector.get('$mdToast');
	}

	constructor () {}
}
