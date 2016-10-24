import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for taking file input.
 */
export class FileInput {
	/** Component title. */
	public static title: string	= 'cyphFileInput';

	/** Component configuration. */
	public static config		= {
		bindings: {
			accept: '@',
			fileChange: '&'
		},
		controller: FileInput,
		template: Templates.fileInput
	};


	public accept: string;
	public fileChange: Function;

	constructor ($scope, $element) {
		const $input	= $element.children();
		const input		= $input[0];
		const lock		= {};

		$input.
			change(() => {
				if (input.files.length < 1 || !this.fileChange) {
					return;
				}

				$scope.$parent.file	= input.files[0];
				this.fileChange();

				$scope.$parent.file	= null;
				$input.val('');
			}).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			}).
			parent().parent().click(() => Util.lock(lock, async () => {
				Util.triggerClick(input);

				for (let i = 0 ; input.files.length < 1 && i < 10 ; ++i) {
					await Util.sleep(500);
				}

				await Util.sleep(500);
			}))
		;
	}
}
