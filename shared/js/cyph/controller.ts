module Cyph {
	export class Controller implements IController {
		public update () : void {
			const phase: string	= this.$scope.$root.$$phase;

			if (phase !== '$apply' && phase !== '$digest') {
				this.$scope.$apply();
			}
		}

		public constructor (private $scope: any) {}
	}
}
