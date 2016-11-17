import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';
import {UpgradeComponent} from '@angular/upgrade/static';
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
			self: '<',
			hideDisconnectMessage: '<'
		},
		controller: ChatMain,
		template: Templates.chatMain,
		transclude: true
	};


	public Cyph: any;
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

		(async () => {
			while (!self['Cyph']) {
				await Util.sleep(100);
			}

			this.Cyph	= self['Cyph'];
		})();
	}
}
