import {NgModule} from '@angular/core';
import {MatBadgeModule} from '@angular/material/badge';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyNativeDateModule as MatNativeDateModule} from '@angular/material/legacy-core';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconRegistry} from '@angular/material/icon';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';
import {MatLegacyProgressBarModule as MatProgressBarModule} from '@angular/material/legacy-progress-bar';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatSortModule} from '@angular/material/sort';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {DomSanitizer} from '@angular/platform-browser';
import {Router, RouterModule} from '@angular/router';
import {PickerModule} from '@ctrl/ngx-emoji-mart';
import {EmojiModule} from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
	FaIconLibrary,
	FontAwesomeModule
} from '@fortawesome/angular-fontawesome';
import {faFacebookF} from '@fortawesome/free-brands-svg-icons/faFacebookF';
import {faFacebookMessenger} from '@fortawesome/free-brands-svg-icons/faFacebookMessenger';
import {faGooglePlusG} from '@fortawesome/free-brands-svg-icons/faGooglePlusG';
import {faLine} from '@fortawesome/free-brands-svg-icons/faLine';
import {faLinkedinIn} from '@fortawesome/free-brands-svg-icons/faLinkedinIn';
import {faMix} from '@fortawesome/free-brands-svg-icons/faMix';
import {faPinterestP} from '@fortawesome/free-brands-svg-icons/faPinterestP';
import {faRedditAlien} from '@fortawesome/free-brands-svg-icons/faRedditAlien';
import {faTelegramPlane} from '@fortawesome/free-brands-svg-icons/faTelegramPlane';
import {faTumblr} from '@fortawesome/free-brands-svg-icons/faTumblr';
import {faTwitter} from '@fortawesome/free-brands-svg-icons/faTwitter';
import {faVk} from '@fortawesome/free-brands-svg-icons/faVk';
import {faWhatsapp} from '@fortawesome/free-brands-svg-icons/faWhatsapp';
import {faXing} from '@fortawesome/free-brands-svg-icons/faXing';
import {faCheck} from '@fortawesome/free-solid-svg-icons/faCheck';
import {faCommentAlt} from '@fortawesome/free-solid-svg-icons/faCommentAlt';
import {faEllipsisH} from '@fortawesome/free-solid-svg-icons/faEllipsisH';
import {faEnvelope} from '@fortawesome/free-solid-svg-icons/faEnvelope';
import {faExclamation} from '@fortawesome/free-solid-svg-icons/faExclamation';
import {faLink} from '@fortawesome/free-solid-svg-icons/faLink';
import {faMinus} from '@fortawesome/free-solid-svg-icons/faMinus';
import {faPrint} from '@fortawesome/free-solid-svg-icons/faPrint';
import {DocumentEditorContainerModule} from '@syncfusion/ej2-angular-documenteditor';
import {
	RecurrenceEditorModule,
	ScheduleAllModule
} from '@syncfusion/ej2-angular-schedule';
import {SplitButtonModule} from '@syncfusion/ej2-angular-splitbuttons';
import {registerLicense as registerSyncfusionLicense} from '@syncfusion/ej2-base';
import {NgxSpeedDialModule} from 'ngx-speed-dial';
import {AngularDraggableModule} from 'angular2-draggable';
import {DxFileManagerModule} from 'devextreme-angular/ui/file-manager';
import {ShareModule} from 'ngx-sharebuttons';
import {ShareButtonsModule} from 'ngx-sharebuttons/buttons';
import {ShareIconsModule} from 'ngx-sharebuttons/icons';
import {FileManagerComponent} from '../components/file-manager';
import {SidenavComponent} from '../components/sidenav';
import {SimpleEmojiPickerComponent} from '../components/simple-emoji-picker';
import {SocialShareComponent} from '../components/social-share';
import {VideoComponent} from '../components/video';
import {config} from '../config';
import {InitDirective} from '../directives/init.directive';
import {env} from '../env';
import {webModuleProviders} from '../providers/web-module';
import {LocalStorageService} from '../services/local-storage.service';
import {CyphSharedModule} from './cyph-shared.module';

registerSyncfusionLicense(config.syncfusionLicenseKey);

/**
 * Common module with shared imports for web projects.
 */
@NgModule({
	declarations: [
		FileManagerComponent,
		InitDirective,
		SidenavComponent,
		SimpleEmojiPickerComponent,
		SocialShareComponent,
		VideoComponent
	],
	exports: [
		AngularDraggableModule,
		CyphSharedModule,
		DocumentEditorContainerModule,
		DxFileManagerModule,
		EmojiModule,
		FileManagerComponent,
		InitDirective,
		MatBadgeModule,
		MatBottomSheetModule,
		MatButtonToggleModule,
		MatCardModule,
		MatExpansionModule,
		MatGridListModule,
		MatMenuModule,
		MatNativeDateModule,
		MatPaginatorModule,
		MatProgressBarModule,
		MatSidenavModule,
		MatSnackBarModule,
		MatSortModule,
		MatTableModule,
		MatTabsModule,
		MatToolbarModule,
		PickerModule,
		RecurrenceEditorModule,
		RouterModule,
		ScheduleAllModule,
		ShareModule,
		ShareButtonsModule,
		ShareIconsModule,
		SidenavComponent,
		SimpleEmojiPickerComponent,
		NgxSpeedDialModule,
		SocialShareComponent,
		SplitButtonModule,
		VideoComponent
	],
	imports: [
		AngularDraggableModule,
		CyphSharedModule,
		DocumentEditorContainerModule,
		DxFileManagerModule,
		EmojiModule,
		FontAwesomeModule,
		MatBadgeModule,
		MatBottomSheetModule,
		MatCardModule,
		MatExpansionModule,
		MatGridListModule,
		MatMenuModule,
		MatNativeDateModule,
		MatPaginatorModule,
		MatProgressBarModule,
		MatSidenavModule,
		MatSnackBarModule,
		MatSortModule,
		MatTableModule,
		MatTabsModule,
		MatToolbarModule,
		PickerModule,
		RecurrenceEditorModule,
		RouterModule,
		ScheduleAllModule,
		ShareModule,
		ShareButtonsModule,
		ShareIconsModule,
		NgxSpeedDialModule
	],
	providers: webModuleProviders
})
export class CyphWebModule {
	constructor (
		sanitizer: DomSanitizer,
		faIconLibrary: FaIconLibrary,
		matIconRegistry: MatIconRegistry,
		localStorageService: LocalStorageService,
		router: Router
	) {
		/* Custom Icons */

		matIconRegistry.addSvgIcon(
			'bitcoin',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/icons/cryptocurrencies/BTC.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'diamond',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/iconfinder/diamond.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'doctor',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/iconfinder/doctor.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'gdpr',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/iconfinder/gdpr.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'key-add-color',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/icons/key-add-color.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'key-add-light',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/icons/key-add-light.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'key-upload',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/icons/key-upload.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'key-upload-color',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/icons/key-upload-color.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'medical-forms',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/iconfinder/medical-forms.svg'
			)
		);

		matIconRegistry.addSvgIcon(
			'walkie-talkie',
			sanitizer.bypassSecurityTrustResourceUrl(
				'/assets/img/iconfinder/walkie-talkie.svg'
			)
		);

		/* Font Awesome icons */

		faIconLibrary.addIcons(
			faCheck,
			faCommentAlt,
			faEllipsisH,
			faEnvelope,
			faExclamation,
			faFacebookF,
			faFacebookMessenger,
			faGooglePlusG,
			faLine,
			faLink,
			faLinkedinIn,
			faMinus,
			faMix,
			faPinterestP,
			faPrint,
			faRedditAlien,
			faTelegramPlane,
			faTumblr,
			faTwitter,
			faVk,
			faWhatsapp,
			faXing
		);

		/* For debugging */

		if (!env.debug) {
			return;
		}

		(<any> self).localStorageService = localStorageService;
		(<any> self).router = router;
	}
}
