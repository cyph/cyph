/**
 * Angular directive for handling changes to the
 * selected file of an input element.
 */
export class Filechange {
	/** Module/directive title. */
	public static title: string	= 'cyphFilechange';

	private static _	= (() => {
		angular.module(Filechange.title, []).directive(Filechange.title, () => ({
			restrict: 'A',
			link: (scope, element, attrs) => {
				element.change(() => {
					const methodSplit: string[]		= attrs[Filechange.title].split('.');
					const methodEndSplit: string[]	= methodSplit.slice(-1)[0].split('(');
					const methodName: string		= methodEndSplit[0];

					const methodArgs: any[]	= methodEndSplit[1].
						replace(/(.*)\).*/, '$1').
						split(',').
						map((s: string) => s.trim()).
						map((s: string) =>
							s === 'this' ? element[0] : scope.$parent.$eval(s)
						)
					;

					const methodObject: any		= scope.$parent.$eval(
						methodSplit.slice(0, -1).join('.')
					);

					methodObject[methodName].apply(methodObject, methodArgs);
				});
			}
		}));
	})();
}
