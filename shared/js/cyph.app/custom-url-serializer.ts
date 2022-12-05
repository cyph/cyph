import {DefaultUrlSerializer, UrlSerializer, UrlTree} from '@angular/router';

/** https://github.com/angular/angular/issues/16621 */
export class CustomUrlSerializer implements UrlSerializer {
	/** @ignore */
	private readonly defaultUrlSerializer = new DefaultUrlSerializer();

	/** @inheritDoc */
	public parse (url: string) : UrlTree {
		return this.defaultUrlSerializer.parse(url);
	}

	/** @inheritDoc */
	public serialize (tree: UrlTree) : string {
		return this.defaultUrlSerializer.serialize(tree).replace(/^\//, '');
	}
}
