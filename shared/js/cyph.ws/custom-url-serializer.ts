import {DefaultUrlSerializer, UrlTree} from '@angular/router';


/** https://github.com/angular/angular/issues/16621 */
export class CustomUrlSerializer extends DefaultUrlSerializer {
	/** @inheritDoc */
	public serialize (tree: UrlTree) : string {
		return super.serialize(tree).replace(/^\//, '');
	}
}
