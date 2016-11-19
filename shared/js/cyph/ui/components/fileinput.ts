import {
	Directive,
	DoCheck,
	ElementRef,
	EventEmitter,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Util} from '../../util';
import {Templates} from '../templates';


/**
 * Angular component for taking file input.
 */
@Directive({
	selector: 'cyph-file-input'
})
export class FileInput extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphFileInput';

	/** Component configuration. */
	public static config		= {
		bindings: {
			accept: '@',
			fileChange: '&'
		},
		template: Templates.fileInput,
		controller: class {
			public accept: string;
			public fileChange: ({file: File}) => void;

			constructor ($element: JQuery) {
				const $input	= $element.children();
				const input		= <HTMLInputElement> $input[0];
				const lock		= {};

				$input.
					change(() => {
						if (input.files.length < 1 || !this.fileChange) {
							return;
						}

						this.fileChange({file: input.files[0]});
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
	};


	@Input() accept: string;
	@Output() fileChange: EventEmitter<File>;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(FileInput.title, elementRef, injector);
	}
}
