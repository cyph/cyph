import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';
import {Templates} from '../templates';


/**
 * Angular component for main chat UI.
 */
@Directive({
	selector: 'cyph-chat-main'
})
export class ChatMain extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphChatMain';

	/** Component configuration. */
	public static config		= {
		bindings: {
			hideDisconnectMessage: '<',
			self: '<'
		},
		controller: class {
			public Cyph: any;
			public self: IChat;
			public hideDisconnectMessage: boolean;

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
			})(); }
		},
		template: Templates.chatMain,
		transclude: true
	};


	@Input() self: IChat;
	@Input() hideDisconnectMessage: boolean;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(ChatMain.title, elementRef, injector);
	}
}
