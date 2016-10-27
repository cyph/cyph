import {CommonModule} from '@angular/common';
import {NgModule, forwardRef} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeAdapter} from '@angular/upgrade';


export const upgradeAdapter	= new UpgradeAdapter(
	forwardRef(() => AppModule)
);


@NgModule({
	imports: [
		BrowserModule,
		CommonModule
	],
	declarations: []
})
export class AppModule {}
