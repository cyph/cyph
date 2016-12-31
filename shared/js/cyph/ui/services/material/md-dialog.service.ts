/**
 * ng2 wrapper for Material1 $mdDialog.
 */
/* tslint:disable-next-line:no-stateless-class */
export class MdDialogService {
	/** @ignore */
	public static deps: string[]	= ['$injector'];

	/** @ignore */
	public static provide: string	= 'MdDialogService';

	/** @ignore */
	public static useFactory ($injector: any) : angular.material.IDialogService {
		return $injector.get('$mdDialog');
	}

	constructor () {}
}
