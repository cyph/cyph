import {Util} from '../util';


/**
 * Reusable HTML view templates.
 */
export const Templates	= {
	app: `
		<span *ngIf='cyph && ui && ui.chat'>
			<section id='main' class='cyph-foreground layout-fill layout-column'>
				<cyph-chat-main
					[self]='ui.chat'
					[hideDisconnectMessage]='ui.coBranded'
					[class.active]='ui.state === cyph.im.States.chat'
					class='cyph-view layout-fill layout-column flex'
				>
					<cyph-signup-form [self]='ui.signupForm'>
						{{cyph.Strings.signupMessage1}}
						{{cyph.Strings.signupMessage2}}
					</cyph-signup-form>
				</cyph-chat-main>

				<cyph-static-cyph-spinning-up
					[class.active]='ui.state === cyph.im.States.spinningUp'
					class='cyph-view layout-fill layout-column flex'
				></cyph-static-cyph-spinning-up>

				<cyph-link-connection
					[self]='ui.cyphConnection'
					[class.active]='ui.state === cyph.im.States.waitingForFriend'
					class='cyph-view layout-fill layout-column flex'
				></cyph-link-connection>

				<cyph-static-cyph-not-found
					[class.active]='ui.state === cyph.im.States.error'
					class='cyph-view layout-fill layout-column flex'
				></cyph-static-cyph-not-found>

				<cyph-beta
					[class.active]='ui.state === cyph.im.States.beta'
					class='cyph-view layout-fill layout-column flex'
				></cyph-beta>

				<div
					[class.active]='ui.state === cyph.im.States.blank'
					id='blank'
					class='cyph-view layout-fill layout-column flex'
				></div>

				<footer>
					<cyph-chat-message-box
						[self]='ui.chat'
						*ngIf='ui.state === cyph.im.States.chat'
					></cyph-chat-message-box>

					<cyph-static-footer></cyph-static-footer>
				</footer>
			</section>

			<cyph-chat-cyphertext [self]='ui.chat'></cyph-chat-cyphertext>
		</span>
	`,

	beta: `
		<md-content
			class='nano'
			layout='column'
			layout-fill
			flex
		>
			<div class='nano-content'>
				<div
					class='login-form'
					ng-show='$ctrl.ui.betaState === $ctrl.cyph.im.BetaStates.login'
					ng-class='{checking: $ctrl.checking}'
					layout='row'
					layout-align='center center'
				>
					<md-card flex='75' class='md-padding'>
						<md-card-title>
							<md-card-title-text>
								<span class='md-headline' translate>
									Log In
								</span>
								<span class='md-subhead' translate>
									Welcome to Cyph! You can log in to your beta account here.
								</span>
							</md-card-title-text>
						</md-card-title>
						<md-card-content>
							<form>
								<div layout='row' layout-align='center center'>
									<md-subheader ng-style='{visibility: $ctrl.error ? "visible" : "hidden"}'>
										Invalid username or password.
									</md-subheader>
								</div>
								<div layout='row' layout-align='center center'>
									<md-input-container class='md-block' flex='60'>
										<input ng-model='username' aria-label='Username' required />
										<label>Username</label>
									</md-input-container>
								</div>
								<div layout='row' layout-align='center center'>
									<md-input-container class='md-block' flex='60'>
										<input ng-model='password' type='password' aria-label='Password' required />
										<label>Password</label>
									</md-input-container>
								</div>
								<div layout='row' layout-align='center center'>
									<md-button type='submit' aria-label='Log In' translate>
										Log In
									</md-button>
								</div>
							</form>
						</md-card-content>
						<md-progress-circular md-mode='indeterminate'></md-progress-circular>
					</md-card>
				</div>
				<div ng-show='$ctrl.ui.betaState === $ctrl.cyph.im.BetaStates.register'>
					Registration screen
				</div>
				<div ng-show='$ctrl.ui.betaState === $ctrl.cyph.im.BetaStates.settings'>
					Settings screen
				</div>
			</div>
		</md-content>
	`,

	chatCyphertext: `
		<div class='chat-cyphertext nano'>
			<md-content class='nano-content'>
				<md-list layout='column'>
					<md-item
						class='message-item unread'
						ng-repeat='message in $ctrl.self.cyphertext.messages'
						layout='horizontal'
					>
						<span class='message'>
							<strong
								translate
								ng-bind='::message.author + ": "'
							></strong>
							<span flex>{{::message.text}}</span>
							<br />
							<br />
						</span>
					</md-item>
				</md-list>
			</md-content>
			<md-button
				translate
				aria-label='Close Cyphertext'
				class='md-fab md-theme-grey close-button'
				ng-click='$ctrl.self.cyphertext.hide()'
			>
				<strong>&times;</strong>
			</md-button>
		</div>
	`,

	chatMain: `
		<div
			class='chat-main platform-container'
			ng-class='{
				video: $ctrl.self.p2pManager.p2p.isActive,
				mobile: $ctrl.self.isMobile
			}'
			layout='column'
			layout-fill
			flex
		>
			<div
				class='cyph-view loading'
				layout='column'
				layout-fill
				flex
				ng-class='{
					active: $ctrl.self.state === $ctrl.cyph.UI.Chat.States.keyExchange
				}'
			>
				<div flex></div>
				<div class='logo-animation'>
					<img src='/img/logo.animated.gif' alt='Animated Cyph logo' />
				</div>
				<div translate>Initiating key exchange...</div>
				<md-progress-linear
					class='md-accent key-exchange-progress'
					md-mode='determinate'
					ng-value='$ctrl.self.keyExchangeProgress'
				></md-progress-linear>
				<div flex></div>
			</div>

			<div
				class='cyph-view abort-screen loading'
				layout='column'
				layout-fill
				flex
				ng-class='{
					active: $ctrl.self.state === $ctrl.cyph.UI.Chat.States.aborted
				}'
			>
				<div flex></div>
				<div class='logo-animation'>
					<img src='/img/walken.png' alt='Definitely not Christopher Walken' />
				</div>
				<div>
					<div translate>This cyph has been aborted.</div>
					<br />
					<span translate>Please</span>
					<a
						translate
						target='_self'
						ng-href='{{$ctrl.cyph.Env.newCyphUrl}}'
					>try again</a>.
				</div>
				<div flex></div>
			</div>

			<div
				class='cyph-view chat-begin-message loading'
				layout='column'
				layout-fill
				flex
				ng-class='{
					active: $ctrl.self.state === $ctrl.cyph.UI.Chat.States.chatBeginMessage
				}'
			>
				<div flex></div>
				<div class='logo-animation'>
					<img src='/img/logo.animated.connected.gif' alt='Animated Cyph logo' />
				</div>
				<div translate>Securely Connected!</div>
				<md-progress-linear
					class='md-accent key-exchange-progress'
					md-mode='determinate'
					ng-value='100'
				></md-progress-linear>
				<div flex></div>
			</div>

			<div
				class='cyph-view video-call'
				flex
				ng-class='{
					active: $ctrl.self.state === $ctrl.cyph.UI.Chat.States.chat,
					playing: $ctrl.self.p2pManager.p2p.isActive
				}'
			>
				<a class='logo' rel='noreferrer' ng-href='{{$ctrl.cyph.Env.homeUrl}}'>
					<img src='/img/betalogo.mobile.png' alt='Beta logo' />
				</a>
				<div
					class='friend stream'
					ng-show='
						$ctrl.self.p2pManager.p2p.incomingStream.video &&
						!$ctrl.self.p2pManager.p2p.loading
					'
					autoplay
				></div>
				<img
					class='friend'
					ng-show='!(
						$ctrl.self.p2pManager.p2p.incomingStream.video ||
						$ctrl.self.p2pManager.p2p.loading
					)'
					src='/img/voicecall.jpg'
				/>
				<video
					class='me'
					ng-show='$ctrl.self.p2pManager.p2p.outgoingStream.video'
					autoplay
					muted
				></video>

				<md-progress-circular
					ng-show='$ctrl.self.p2pManager.p2p.loading'
					md-mode='indeterminate'
				></md-progress-circular>

				<md-button
					translate
					class='sidebar'
					aria-label='Sidebar'
					ng-click='$ctrl.self.p2pManager.toggleSidebar()'
				>
					<img src='/img/icons/chat.png' alt='Chat' />
				</md-button>

				<div class='buttons'>
					<md-button
						translate
						class='md-fab video-call-button'
						ng-click='$ctrl.self.p2pManager.videoCallButton()'
						ng-attr-aria-label='{{
							!$ctrl.self.p2pManager.p2p.outgoingStream.video ?
								"Enable Camera" :
								"Disable Camera"
						}}'
					>
						<img
							ng-show='!$ctrl.self.p2pManager.p2p.outgoingStream.video'
							src='/img/icons/video.on.png'
							alt='Video on'
						/>
						<img
							ng-show='$ctrl.self.p2pManager.p2p.outgoingStream.video'
							src='/img/icons/video.off.png'
							alt='Video off'
						/>
					</md-button>
					<md-button
						translate
						class='md-fab voice-call-button'
						ng-click='$ctrl.self.p2pManager.voiceCallButton()'
						ng-attr-aria-label='{{
							!$ctrl.self.p2pManager.p2p.outgoingStream.audio ?
								"Enable Mic" :
								"Disable Mic"
						}}'
					>
						<img
							ng-show='!$ctrl.self.p2pManager.p2p.outgoingStream.audio'
							src='/img/icons/mic.on.png'
							alt='Mic on'
						/>
						<img
							ng-show='$ctrl.self.p2pManager.p2p.outgoingStream.audio'
							src='/img/icons/mic.off.png'
							alt='Mic off'
						/>
					</md-button>
					<md-button
						translate
						aria-label='End Call'
						class='md-fab md-theme-grey close-button'
						ng-click='$ctrl.self.p2pManager.closeButton()'
					>
						<strong>&times;</strong>
					</md-button>
				</div>
			</div>

			<cyph-chat-message-box
				class='video-call-message-box'
				self='$ctrl.self'
			></cyph-chat-message-box>

			<div
				class='cyph-view message-list nano'
				flex
				ng-class='{
					active: $ctrl.self.state === $ctrl.cyph.UI.Chat.States.chat
				}'
			>
				<md-content class='nano-content'>
					<md-list layout='column'>
						<md-item
							class='progress'
							ng-repeat='transfer in $ctrl.self.fileManager.files.transfers'
							layout='row'
						>
							<div layout='column' layout-align=' start' flex>
								<div layout='row'>
									<span ng-show='transfer.isOutgoing' translate>Sending</span>
									<span ng-hide='transfer.isOutgoing' translate>Receiving</span>
									&nbsp;
									<span>
										{{transfer.name}}
										({{$ctrl.cyph.Util.readableByteLength(transfer.size)}}):
									</span>
								</div>
								<md-progress-linear
									md-mode='determinate'
									value='{{transfer.percentComplete}}'
									layout='row'
								></md-progress-linear>
							</div>
						</md-item>

						<md-item
							class='message-item unread'
							ng-class='[
								"author-" + (
									$ctrl.cyph.Session.Users[message.author] ||
									$ctrl.cyph.Session.Users.other
								),
								{
									"self-destructed":
										message.selfDestructTimer &&
										message.selfDestructTimer.isComplete
								}
							]'
							ng-repeat='message in $ctrl.self.messages'
							layout='row'
						>
							<div flex layout='column'>
								<div layout='row'>
									<span class='message'>
										<strong
											translate
											class='message-author'
											ng-hide='::message.author === $ctrl.cyph.Session.Users.app'
											ng-bind='::message.author + ": "'
										></strong>
										<cyph-markdown
											class='message-text'
											markdown='message.text'
											ng-class='::{
												"app-message":
													message.author === $ctrl.cyph.Session.Users.app
											}'
										></cyph-markdown>
									</span>
									<span flex class='message-timestamp'>
										<span
											class='mobile-only'
											ng-show='::message.author === $ctrl.cyph.Session.Users.me'
										>
											<span>{{::message.author}}</span> &nbsp;&mdash;&nbsp;
										</span>

										{{::message.timeString}}

										<span
											class='mobile-only'
											ng-show='::
												message.author !== $ctrl.cyph.Session.Users.me &&
												message.author !== $ctrl.cyph.Session.Users.app
											'
										>
											&nbsp;&mdash;&nbsp; <span>{{::message.author}}</span>
										</span>
									</span>
								</div>
								<div
									class='self-destruct-timer'
									layout='row'
									ng-show='message.selfDestructTimer'
								>
									Message will self-destruct in
									<span class='countdown'>
										{{message.selfDestructTimer.timestamp}}
									</span>
								</div>
							</div>
							<div class='self-destruct-cover'></div>
						</md-item>

						<md-item
							class='friend-is-typing'
							ng-class='{"show": $ctrl.self.isFriendTyping}'
							layout='row'
						>
							<span class='ellipsis-spinner'>
								<div class='bounce1'></div>
								<div class='bounce2'></div>
								<div class='bounce3'></div>
							</span>
						</md-item>

						<md-item
							class='chat-end-message'
							ng-show='$ctrl.self.isDisconnected && !$ctrl.hideDisconnectMessage'
							layout='row'
							layout-align='center center'
						>
							<md-card flex='75' flex-gt-sm='50' class='md-padding'>
								<md-card-content>
									<ng-transclude></ng-transclude>
								</md-card-content>
							</md-card>
						</md-item>
					</md-list>
				</md-content>
			</div>
		</div>
	`,

	chatMessageBox: `
		<div
			class='chat-message-box platform-container'
			ng-class='{mobile: $ctrl.self.isMobile}'
			ng-show='
				$ctrl.self.state === $ctrl.cyph.UI.Chat.States.chat &&
				$ctrl.self.session.state.isAlive
			'
		>
			<textarea
				translate
				class='message-box tabIndent'
				ng-model='$ctrl.self.currentMessage'
				ng-trim='false'
				ng-change='$ctrl.self.messageChange()'
				placeholder='Send a secure message...'
			></textarea>

			<md-button
				translate
				class='send-button mobile-only'
				ng-class='{
					"chat-message-box-hidden": $ctrl.self.currentMessage === ""
				}'
				ng-click='$ctrl.self.send()'
				aria-label='Send'
			>
				<md-icon class='grey'>send</md-icon>
			</md-button>

			<md-fab-speed-dial
				md-direction='up'
				class='md-fling md-fab-bottom-right'
				md-open='$ctrl.isSpeedDialOpen'
				ng-mouseenter='$ctrl.isSpeedDialOpen = true'
				ng-mouseleave='$ctrl.isSpeedDialOpen = false'
			>
				<md-fab-trigger>
					<md-button
						aria-label='Menu'
						class='md-fab'
					>
						<md-icon>add</md-icon>
					</md-button>
				</md-fab-trigger>
				<md-fab-actions>
					<md-button
						aria-label='Help'
						class='invert md-fab md-raised md-mini'
						ng-click='$ctrl.self.helpButton()'
					>
						<md-tooltip md-direction='left'>
							Help
						</md-tooltip>
						<md-icon>help_outline</md-icon>
					</md-button>
					<md-button
						aria-label='Send File'
						class='md-fab md-raised md-mini send-file-button'
					>
						<md-tooltip md-direction='left'>
							Send File
						</md-tooltip>
						<md-icon>attach_file</md-icon>
						<cyph-file-input
							file-change='$ctrl.self.fileManager.send(file)'
						></cyph-file-input>
					</md-button>
					<md-button
						aria-label='Send Image'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip md-direction='left'>
							Send Image
						</md-tooltip>
						<md-icon>insert_photo</md-icon>
						<cyph-file-input
							accept='image/*'
							file-change='$ctrl.self.fileManager.send(file, true)'
						></cyph-file-input>
					</md-button>
					<md-button
						aria-label='Voice Call'
						class='md-fab md-raised md-mini'
						ng-click='$ctrl.self.p2pManager.voiceCallButton()'
						ng-disabled='!$ctrl.self.p2pManager.isEnabled'
						ng-hide='$ctrl.self.p2pManager.p2p.isActive'
					>
						<md-tooltip md-direction='left'>
							Voice Call
						</md-tooltip>
						<md-icon>phone</md-icon>
					</md-button>
					<md-button
						aria-label='Video Call'
						class='md-fab md-raised md-mini'
						ng-click='$ctrl.self.p2pManager.videoCallButton()'
						ng-disabled='!$ctrl.self.p2pManager.isEnabled'
						ng-hide='$ctrl.self.p2pManager.p2p.isActive'
					>
						<md-tooltip md-direction='left'>
							Video Call
						</md-tooltip>
						<md-icon>videocam</md-icon>
					</md-button>
					<md-button
						aria-label='Close Chat'
						class='dark md-fab md-raised md-mini'
						ng-click='$ctrl.self.disconnectButton()'
					>
						<md-tooltip md-direction='left'>
							Close Chat
						</md-tooltip>
						<md-icon>close</md-icon>
					</md-button>
				</md-fab-actions>
			</md-fab-speed-dial>

			<md-subheader
				class='new-messages md-subheader-colored md-sticky-clone'
				ng-show='$ctrl.self.scrollManager.unreadMessages > 0'
				sticky-state='active'
				ng-click='$ctrl.self.scrollManager.scrollDown()'
			>
				<strong>&#8595;&nbsp;&nbsp;</strong>
				<span
					translate
					ng-bind='
						$ctrl.self.scrollManager.unreadMessages +
						" " + "new" + " " +
						(
							$ctrl.self.scrollManager.unreadMessages > 1 ?
								"messages" :
								"message"
						)
					'
				></span>
			</md-subheader>
		</div>
	`,

	checkout: `
		<form>
			<div ng-hide='$ctrl.complete'>
				<div class='checkout-ui'>
					<div class='braintree'></div>
					<div layout='row' layout-sm='column' layout-xs='column'>
						<md-input-container class='md-block' flex>
							<input ng-model='$ctrl.name' aria-label='Name' />
							<label>Name</label>
						</md-input-container>
						<md-input-container class='md-block' flex>
							<input ng-model='$ctrl.email' type='email' aria-label='Email' required />
							<label>Email</label>
						</md-input-container>
					</div>
				</div>
				<md-button type='submit'>
					Confirm \${{$ctrl.amount}} payment
				</md-button>
			</div>
			<div translate class='confirmation' ng-show='$ctrl.complete'>
				<ng-transclude></ng-transclude>
			</div>
		</form>
	`,

	contact: `
		<div>
			<form ng-submit='$ctrl.send()' ng-hide='$ctrl.self.sent'>
				<div layout-gt-xs='row'>
					<md-input-container class='md-block' flex>
						<label>Cyph team to contact</label>
						<md-select ng-model='$ctrl.self.to'>
							<md-option
								ng-repeat='address in $ctrl.cyph.Config.cyphEmailAddresses'
								value='{{address}}'
							>
								{{address}}
							</md-option>
						</md-select>
					</md-input-container>
				</div>
				<div layout='row'>
					<md-input-container class='md-block' flex>
						<input ng-model='$ctrl.self.fromName' aria-label='Name' />
						<label>Name</label>
					</md-input-container>
					<md-input-container class='md-block' flex>
						<input
							ng-model='$ctrl.self.fromEmail'
							type='email'
							aria-label='Email'
							required
						/>
						<label>Email</label>
					</md-input-container>
				</div>
				<md-input-container class='md-block'>
					<input ng-model='$ctrl.self.subject' aria-label='Subject' />
					<label>Subject</label>
				</md-input-container>
				<md-input-container class='md-block'>
					<textarea
						ng-model='$ctrl.self.message'
						aria-label='Message'
						md-select-on-focus
						required
					></textarea>
					<label>Message</label>
				</md-input-container>
				<md-button type='submit' aria-label='Send' translate>
					Send
				</md-button>
			</form>
			<div ng-show='$ctrl.self.sent'>
				Your email has been sent! Someone on the team will get back to you shortly.
			</div>
		</div>
	`,

	fileInput: `
		<input type='file' ng-attr-accept='{{$ctrl.accept}}' />
	`,

	helpModal: `
		<md-dialog class='help'>
			<md-content>
				<md-tabs md-dynamic-height md-border-bottom>
					<md-tab label='Formatting Help'>
						<p>
							<span translate>Cyph uses a version of Markdown called</span>
							<a href='http://commonmark.org/'>CommonMark</a>
							<span translate>
								for formatting. We also support various extensions &ndash;
								including emojis and code fencing.
							</span>
						</p>
						<p translate>
							The following examples are shamelessly copied from reddit:
						</p>
						<table>
							<tbody>
								<tr>
									<th translate>you type:</th>
									<th translate>you see:</th>
								</tr>
								<tr>
									<td>*<span translate>italics</span>*</td>
									<td><em translate>italics</em></td>
								</tr>
								<tr>
									<td>**<span translate>bold</span>**</td>
									<td><b translate>bold</b></td>
								</tr>
								<tr>
									<td>[cyph <span translate>me</span>!](https://cyph.com)</td>
									<td><a href='https://cyph.com'>cyph <span translate>me</span>!</a></td>
								</tr>
								<tr>
									<td>
										<br />
										* <span translate>item 1</span>
										<br />
										* <span translate>item 2</span>
										<br />
										* <span translate>item 3</span>
									</td>
									<td>
										<ul>
											<li translate>item 1</li>
											<li translate>item 2</li>
											<li translate>item 3</li>
										</ul>
									</td>
								</tr>
								<tr>
									<td>
										<br />
										&gt; <span translate>quoted text</span>
									</td>
									<td>
										<blockquote translate>quoted text</blockquote>
									</td>
								</tr>
								<tr>
									<td>
										<span translate>Lines starting with tabs are treated like code:</span>

										<br />
										<br />

										<span class='spaces'>&nbsp;&nbsp;&nbsp;&nbsp;</span>
										if 1 * 2 &lt; 3:
										<br />
										<span class='spaces'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
										print "hello!"
										<br />
									</td>
									<td>
										<span translate>Lines starting with tabs are treated like code:</span>

										<br />
										<br />

										<pre>if 1 * 2 &lt; 3:<br />&nbsp;&nbsp;&nbsp;&nbsp;print "hello!"</pre>
									</td>
								</tr>
								<tr>
									<td>~~<span translate>strikethrough</span>~~</td>
									<td><strike translate>strikethrough</strike></td>
								</tr>
								<tr>
									<td><span translate>super</span>^<span translate>script</span>^</td>
									<td><span translate>super</span><sup translate>script</sup></td>
								</tr>
							</tbody>
						</table>
					</md-tab>
					<md-tab label='Contact Cyph' ng-disabled='$ctrl.ui.coBranded'>
						<span translate>Please check out the</span>
						<a href='{{$ctrl.cyph.Env.homeUrl}}faq'>FAQs</a>
						<span translate>first!</span>
						<br />
						<br />
						<br />
						<cyph-contact to='"help"'></cyph-contact>
					</md-tab>
				</md-tabs>
			</md-content>
		</md-dialog>
	`,

	home: `
		<section id='main' layout='column' ng-class='{"unisection-mode": $ctrl.ui.state !== $ctrl.cyph.com.States.home}'>
			<md-toolbar id='main-toolbar' class='wow animated fadeInDownBig'>
				<div class='md-toolbar-tools'>
					<span class='padding'></span>

					<a id='logo' href='/'>
						<img src='/img/logo.white.horizontal.header.png' alt='Horizontal white Cyph logo with transparent background' />
					</a>

					<md-button id='new-cyph' aria-label='Start new cyph' class='breathe'>
						<a translate ng-href='{{$ctrl.cyph.Env.newCyphUrl}}'>Start new cyph</a>
					</md-button>

					<span class='link-wrapper-outer right desktop-only'>
						<span class='link-wrapper-inner'>
							<md-button translate href='/intro'>Intro</md-button>
							<md-button translate href='/features'>Features</md-button>
							<md-button translate href='/about'>About</md-button>
							<md-button translate href='/gettingstarted'>Getting Started</md-button>
						</span>
					</span>
					<span flex class='desktop-only'></span>
					<span class='link-wrapper-outer left desktop-only'>
						<span class='link-wrapper-inner'>
							<md-button translate href='/blog'>Blog</md-button>
							<md-button translate href='/faq'>FAQ</md-button>
							<md-button translate href='/pricing'>Pricing</md-button>
							<md-button translate href='/register'>Register</md-button>
						</span>
					</span>

					<span class='social-media desktop-only'>
						<md-button
							aria-label='GitHub'
							rel='noreferrer'
							href='https://github.com/cyph'
							target='_blank'
						>
							<img src='/img/iconfinder/github.png' alt='GitHub icon' />
						</md-button>
						<md-button
							aria-label='Twitter'
							rel='noreferrer'
							href='https://twitter.com/cyph'
							target='_blank'
						>
							<img src='/img/iconfinder/twitter.png' alt='Twitter icon' />
						</md-button>
						<md-button
							aria-label='Facebook'
							rel='noreferrer'
							href='https://www.facebook.com/pages/Cyph/299270843606014'
							target='_blank'
						>
							<img src='/img/iconfinder/facebook.png' alt='Facebook icon' />
						</md-button>
					</span>

					<span flex class='mobile-only'></span>
					<md-button translate aria-label='Menu' ng-click='$ctrl.ui.openMobileMenu()' class='mobile-only'>
						<img src='/img/icons/menu.png' alt='Menu' />
					</md-button>

					<span class='padding'></span>
				</div>
			</md-toolbar>

			<md-sidenav md-component-id='main-toolbar-sidenav' class='md-sidenav-right'>
				<md-content class='md-padding'>
					<div>
						<md-button translate href='/intro' ng-click='$ctrl.ui.baseButtonClick()'>
							Intro
						</md-button>
					</div>
					<div>
						<md-button translate href='/features' ng-click='$ctrl.ui.baseButtonClick()'>
							Features
						</md-button>
					</div>
					<div>
						<md-button translate href='/about' ng-click='$ctrl.ui.baseButtonClick()'>
							About
						</md-button>
					</div>
					<div>
						<md-button translate href='/gettingstarted' ng-click='$ctrl.ui.baseButtonClick()'>
							Getting Started
						</md-button>
					</div>
					<div>
						<md-button translate href='/blog' ng-click='$ctrl.ui.baseButtonClick()'>
							Blog
						</md-button>
					</div>
					<div>
						<md-button translate href='/faq' ng-click='$ctrl.ui.baseButtonClick()'>
							FAQ
						</md-button>
					</div>
					<div>
						<md-button translate href='/pricing' ng-click='$ctrl.ui.baseButtonClick()'>
							Pricing
						</md-button>
					</div>
					<div>
						<md-button translate href='/register' ng-click='$ctrl.ui.baseButtonClick()'>
							Register
						</md-button>
					</div>
					<div>
						<md-button
							rel='noreferrer'
							href='https://github.com/cyph'
							target='_blank'
							ng-click='$ctrl.ui.baseButtonClick()'
						>
							<span class='image'>
								<img src='/img/iconfinder/github.png' alt='GitHub icon' />
							</span>
							<span>GitHub</span>
						</md-button>
					</div>
					<div>
						<md-button
							rel='noreferrer'
							href='https://twitter.com/cyph'
							target='_blank'
							ng-click='$ctrl.ui.baseButtonClick()'
						>
							<span class='image'>
								<img src='/img/iconfinder/twitter.png' alt='Twitter icon' />
							</span>
							<span>Twitter</span>
						</md-button>
					</div>
					<div>
						<md-button
							rel='noreferrer'
							href='https://www.facebook.com/pages/Cyph/299270843606014'
							target='_blank'
							ng-click='$ctrl.ui.baseButtonClick()'
						>
							<span class='image'>
								<img src='/img/iconfinder/facebook.png' alt='Facebook icon' />
							</span>
							<span>Facebook</span>
						</md-button>
					</div>
				</md-content>
			</md-sidenav>


			<section id='hero-section'>
				<div class='hero-foreground'>
					<div
						id='promo-section'
						ng-if='$ctrl.ui.promo !== $ctrl.cyph.com.Promos.none'
						layout='row'
						layout-align='center center'
					>
						<md-card
							class='animated wow'
							data-wow-delay='3000ms'
							ng-class='$ctrl.ui.promo === $ctrl.cyph.com.Promos.jjgo ? "bounceInLeft" : "bounceInDown"'
							flex='33'
							flex-sm='66'
							flex-xs='100'
						>
							<md-card-header>
								<md-card-header-text>
									<img ng-src='/img/thirdparty/{{$ctrl.cyph.com.Promos[$ctrl.ui.promo]}}.png' />
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p>
									<span translate>Welcome </span>
									<span ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.betalist'>Betalisters!</span>
									<span ng-hide='$ctrl.ui.promo === $ctrl.cyph.com.Promos.betalist'>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.penn'>Penn's Sunday School</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.jjgo'>Jordan, Jesse, Go!</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.ventura'>We The People</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.sawbones'>Sawbones</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.judgejohn'>Judge John Hodgman</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.mybrother'>My Brother, My Brother and Me</i>
										<i ng-if='$ctrl.ui.promo === $ctrl.cyph.com.Promos.security'>The Security Brief</i>
										<span translate>listeners!</span>
									</span>
								</p>
								<p>
									<a href='/register' translate>Sign up now</a>,
									<span translate>and you'll get extra priority on our waitlist for a Cyph beta account.</span>
								</p>
							</md-card-content>
						</md-card>
					</div>

					<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
						Secure your <span class='feature-cycle'>{{$ctrl.ui.features[$ctrl.ui.featureIndex]}}</span> in one click.
					</h1>

					<div class='hero-container grid-container'>
						<div layout='row'>
							<div flex='25'></div>
							<div
								class='wow desktop-only desktop-class-bounceInLeft tablet-grid-25 mobile-grid-100'
								data-wow-delay='2250ms'
							>
								<a href='/intro'>
									<img class='laptop screenshot' src='/img/laptop-screenshot.png' alt='Laptop displaying secure Cyph video call' />
								</a>
								&nbsp;
							</div>
							<div
								class='wow desktop-only desktop-class-bounceInRight tablet-grid-25 mobile-grid-100'
								data-wow-delay='2250ms'
							>
								<a href='/intro'>
									<img class='phone screenshot' src='/img/phone-screenshot.png' alt='Phone displaying secure Cyph video call' />
								</a>
								&nbsp;
							</div>
							<div flex='25'></div>
						</div>
						<div class='hero-description wow animated fadeIn' data-wow-delay='2500ms'>
							<p translate>
								Just send a link &mdash;
								no signups or downloads required!
							</p>
						</div>
					</div>
				</div>

				<div class='hero-background-wrapper'>
					<div class='hero-background'>
						<video autoplay loop mobile-poster='/video/background.png'>
							<source src='/video/background.mp4' type='video/mp4' />
							<source src='/video/background.ogv' type='video/ogg' />
						</video>
					</div>
				</div>
			</section>

			<section id='testimonials-section'>
				<div class='carousel grid-container wow animated fadeIn' data-wow-delay='2750ms'>
					<div class='grid-25 tablet-grid-25'>
						<a class='logo' ng-click='$ctrl.ui.testimonialCarousel.setItem(0)' target='_blank'>
							<img src='/img/thirdparty/cure53.png' alt='Cure53 logo' />
						</a>
					</div>

					<div class='quote-container grid-50 tablet-grid-50'>
						<div class='quote'>
							<div class='text' translate>
								Cyph provides security from a broad range of cryptographic attacks and very strong client-side crypto. The general conclusion of the test is that no major issues in regards to application security or cryptographic implementations could be spotted in spite of a thorough audit.
							</div>
							<div class='extra'>
								<a href='data:text/plain;base64,LS0tLS1CRUdJTiBQR1AgU0lHTkVEIE1FU1NBR0UtLS0tLQ0KSGFzaDogU0hBMjU2DQoNCkN5cGggcHJvdmlkZXMgdmVyeSBzdHJvbmcgY2xpZW50LXNpZGUgY3J5cHRvIGFuZCBzZWN1cml0eSBmcm9tIGEgYnJvYWQNCnJhbmdlIG9mIGNyeXB0b2dyYXBoaWMgYXR0YWNrcy4NCg0KVGhlIGdlbmVyYWwgY29uY2x1c2lvbiBvZiB0aGUgdGVzdCBpcyB0aGF0IG5vIG1ham9yIGlzc3VlcyBpbiByZWdhcmRzDQp0byBhcHBsaWNhdGlvbiBzZWN1cml0eSBvciBjcnlwdG9ncmFwaGljIGltcGxlbWVudGF0aW9ucyBjb3VsZCBiZQ0Kc3BvdHRlZCBpbiBzcGl0ZSBvZiBhIHRob3JvdWdoIGF1ZGl0Lg0KDQpNYXJpbyBIZWlkZXJpY2gsIEp1bHkgMzEsIDIwMTUNCg0KLS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0NClZlcnNpb246IEdudVBHIHYyLjAuMTcgKEdOVS9MaW51eCkNCg0KaVFFY0JBRUJDQUFHQlFKV285Z3lBQW9KRUhEVXkwclRORUdvL0ZBSUFKc2VwRW9mMWJ6Mkw1bXFUOUJpb0JEaQ0KSTJXaHh5RE1xWXhla2lIcFY5SzM3dEZsUFQ1aHN3VCtvVVJyYTc1eVRXU20yKzNWM2JrMG1zdWY5TDd2WWt4eg0KcjRsMmFaeC91aXM4Sks1VVZJa1BaOGNNbGlXMnhmNVBCdFNTWWQ1REtubThsNVk1Q0VaWG4xQ3E4RUFJdmVtWg0KeW5rbjNmWVVlZCtiZWdoWisybjdFSjhBZlRuRWRLdGtqWXpGbFp4LytWbG1kZ1h0U1Q0UTA4eUg4N0JZS2gyUw0KUUlWWTV0bURDcHVvbWdWNWdWY3RURzB3MGliWXhsMHZVVGt5UGJEZHpwLzdjZGVURERuZXRhTTYxQVBOSVg4dQ0KR3pMcE5HNjZIZy95cEtzZ2JSelZreEtBOWtFbndxS25yYlVpQStJaXZ0Q2FUODlwTDRQM3VzQ3I5YUFlamRrPQ0KPVhkSlMNCi0tLS0tRU5EIFBHUCBTSUdOQVRVUkUtLS0tLQ==' target='_blank'>Conclusion</a>
								<span translate>of the</span>
								<a rel='noreferrer' href='https://cure53.de/pentest-report_cyph.pdf' target='_blank' translate>independent security audit</a>
								<span translate>conducted by</span>
								<a rel='noreferrer' href='https://cure53.de' target='_blank'>Cure53</a>
								<br />
								<span translate>(funded by the</span>
								<a rel='noreferrer' href='https://www.opentechfund.org' target='_blank'>Open Technology Fund</a>)
							</div>
						</div>
						<div class='quote'>
							<div class='text' translate>
								I like the simple, nonintrusive interface and the single-minded emphasis on doing one thing really well. We will definitely continue using Cyph for these types of conversations.
							</div>
							<div class='extra'>
								<a rel='noreferrer' href='http://uplift.aero' target='_blank'>Uplift Aeronautics</a>
								<span translate>CEO Mark Jacobsen, on the</span>
								<a rel='noreferrer' href='https://www.indiegogo.com/projects/the-syria-airlift-project' target='_blank'>Syria Airlift Project</a>
							</div>
						</div>
						&nbsp;
					</div>

					<div class='grid-25 tablet-grid-25'>
						<a class='logo' ng-click='$ctrl.ui.testimonialCarousel.setItem(1)' target='_blank'>
							<img src='/img/thirdparty/upliftaero.png' alt='Uplift Aeronautics logo' />
						</a>
					</div>
				</div>

				<a class='nav-arrow desktop-only' href='/intro'>
					<img src='/img/icons/downarrow.png' alt='Down arrow' />
				</a>
			</section>

			<section id='intro-section'>
				<a class='nav-arrow desktop-only' href='/'>
					<img src='/img/icons/uparrow.png' alt='Up arrow' />
				</a>

				<div class='demo-root grid-container'>
					<span class='desktop desktop-only'>
						<div class='cyph-foreground'>
							<cyph-chat-main
								self='$ctrl.ui.cyphDemo.desktop'
								layout='column'
								layout-fill
								flex
							>
								We hope you enjoyed our quick demo! Just click
								the "start new cyph" button to use it for real.
							</cyph-chat-main>
							<cyph-chat-message-box self='$ctrl.ui.cyphDemo.desktop'></cyph-chat-message-box>
						</div>
						<cyph-chat-cyphertext self='$ctrl.ui.cyphDemo.desktop'></cyph-chat-cyphertext>
					</span>

					<span class='mobile'>
						<div class='cyph-foreground'>
							<cyph-chat-main
								self='$ctrl.ui.cyphDemo.mobile'
								layout='column'
								layout-fill
								flex
							>
								Tell your friends.
							</cyph-chat-main>
							<cyph-chat-message-box self='$ctrl.ui.cyphDemo.mobile'></cyph-chat-message-box>
						</div>
						<cyph-chat-cyphertext self='$ctrl.ui.cyphDemo.mobile'></cyph-chat-cyphertext>
					</span>
				</div>
			</section>

			<section id='features-section'>
				<div class='carousel grid-container'>
					<div class='grid-parent grid-33 tablet-grid-33'>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(0)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/encryption.png'
								alt='Secure vault'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									Seriously Strong Encryption
								</h3>
							</div>
						</div>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(1)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/anonymous.png'
								alt='Man in disguise'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									Anonymity via Tor Hidden Service
								</h3>
							</div>
						</div>
					</div>

					<div class='grid-parent grid-33 tablet-grid-33'>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(2)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/video.png'
								alt='Video camera'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									Video Calling and File Transfers
								</h3>
							</div>
						</div>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(3)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/signing.png'
								alt='Cryptographic signature'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									Application Integrity Validation
								</h3>
							</div>
						</div>
					</div>

					<div class='grid-parent grid-33 tablet-grid-33'>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(4)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/nologin.png'
								alt='"No login" sign'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									No Signup or Downloads Required
								</h3>
							</div>
						</div>
						<div class='grid-100 tablet-grid-100 logo logo-text' ng-click='$ctrl.ui.featureCarousel.setItem(5)'>
							<img
								class='grid-25 tablet-grid-25'
								src='/img/iconfinder/crossplatform.png'
								alt='Desktop, tablet, and phone'
							/>
							<div class='grid-75 tablet-grid-75'>
								<h3 class='title' translate>
									Cross-Platform &mdash; Works on Any Device
								</h3>
							</div>
						</div>
					</div>

					<div class='quote-container grid-70 tablet-grid-70 push-15 tablet-push-15'>
						<div class='quote'>
							<div class='text'>
								<p>
									<span translate>Cyph is end-to-end encrypted using our patent-pending</span>
									<a
										target='_blank'
										rel='noreferrer'
										href='https://docs.google.com/document/d/1XVh4ALXhbfxi70QSUY-xHclauob8O635bSySy6f1Ysk'
									>Castle messaging protocol</a>.
									<span translate>Castle is an encryption protocol inspired by the classic</span>
									<a
										target='_blank'
										rel='noreferrer'
										href='https://en.wikipedia.org/wiki/Off-the-Record_Messaging'
									>Off-the-Record (OTR)</a>,
									<span translate>
										with a number of architectural details influenced by Open Whisper Systems'
										Signal Protocol &mdash; such as the use of elliptic curves (ECDH/Curve25519).
									</span>
								</p>
								<p>
									<span translate>
										The major departure that Castle takes from these other solutions is that
										it's been designed to theoretically withstand an attack from a quantum computer
										running Shor's algorithm (50 - 100 years from now). This is thanks to
									</span>
									<a
										target='_blank'
										href='/blog/2015/09/29/ntru'
									>our incorporation of the post-quantum cipher NTRU</a>,
									<span translate>
										along with lower-level details such as a unique public key authentication
										technique that mitigates the theoretical strengths of a quantum computer.
										This helps ensure that your now-private conversations won't one day suddenly
										become public after an accident of science.
									</span>
								</p>
								<p>
									<span translate>Fun fact: to crack a single Castle message would require</span>
									<span>10</span><sup>38</sup>
									<span translate>Tianhe-2 supercomputers running for the lifetime of the universe.</span>
								</p>
							</div>
						</div>
						<div class='quote'>
							<div class='text'>
								<p>
									<span translate>Just connect to the Tor network and navigate to</span>
									<a
										class='oneline'
										target='_blank'
										ng-href='https://www.{{$ctrl.cyph.Config.onionRoot}}'
									>cyphdbyhiddenbhs.onion</a>
									<em>("cyph'd by hidden backbone host server")</em>.
									<span translate>
										While this won't totally eliminate communication metadata in the way that
										solutions like Ricochet are designed to, it does very effectively obfuscate
										the origin of any traffic you send to Cyph.
									</span>
								</p>
								<p translate>
									Important note: Tor Browser Bundle is not currently supported. A bug in Firefox
									Private Browsing mode (which TBB depends on) currently causes it to misbehave when
									confronted with our TOFU implementation, and subsequently block any access to Cyph.
								</p>
							</div>
						</div>
						<div class='quote'>
							<div class='text'>
								<p>
									<span translate>Voice/video calling is encrypted using a direct peer-to-peer</span>
									<a
										target='_blank'
										rel='noreferrer'
										href='http://tools.ietf.org/html/rfc5764'
									>DTLS-SRTP</a>
									<span translate>
										session between the clients, with public key authenticity assured
										by means of a fingerprint exchange via WebRTC signaling within the
										original Castle session.
									</span>
								</p>
								<p translate>
									File transfers are encrypted symmetrically using a one-time XSalsa20
									key, which is distributed from the sender to any recipients through
									Castle.
								</p>
								<p translate>
									Important note: unlike file transfers and standard Cyph messages,
									voice/video calling is in fact theoretically vulnerable to quantum
									computing attacks, due to a property of the WebRTC specification
									that (by design) blocks us from protecting the entire key exchange
									within our Castle session.
								</p>
							</div>
						</div>
						<div class='quote'>
							<div class='text'>
								<p>
									<span translate>
										Cyph application packages are verified at run-time using our patent-pending
										browser-based Trust on First Use code signing framework,
									</span>
									<a
										target='_blank'
										rel='noreferrer'
										href='https://docs.google.com/document/d/1PGS50eZB9Ud7wVKmrc0HU_FDygZkyuFjmTRrukAz3sw'
									>WebSign</a>.
									<span translate>
										WebSign will protect you even in the event that our servers and/or your TLS
										session are compromised.
									</span>
								</p>
								<p translate>
									Until we solved it, addressing this had long been considered an intractable
									problem, which is why you'll commonly see advice to avoid any product claiming
									to offer private communication or other cryptographic protection from within a web
									app (e.g. MEGAChat, ProtonMail, etc.). With the sole exception of Cyph, such advice
									should be taken very seriously.
								</p>
							</div>
						</div>
						<div class='quote'>
							<div class='text'>
								<p translate>
									Cyph is extremely simple for anybody to use, and runs anywhere in one click
									&mdash; no installation or registration required. This makes it very easy
									to jump right into using, or to deploy to any new device (in addition to
									completely eliminating any potential hassle for friends with whom you intend
									to engage in encrypted communications).
								</p>
							</div>
						</div>
						<div class='quote'>
							<div class='text'>
								<p translate>
									Since Cyph runs right in your browser (being, quite literally, the only secure web app in
									existence; see "Application Integrity Validation"), you can use it from your desktop,
									laptop, phone, or tablet &mdash; just about any relatively recent device! We've got native
									mobile and desktop apps in the works as well, so be sure to keep an eye out for when you
									can download Cyph.
								</p>
							</div>
						</div>
						&nbsp;
					</div>
				</div>
			</section>

			<section id='about-section'>
				<h1 class='hero-text' translate>
					About Cyph
				</h1>
				<div class='section-content-container'>
					<p translate>
						Cyph is a secure communication tool designed to be extremely friendly for users of any technical
						skill level, providing such features as encrypted video calling and file transfers to both individuals
						and businesses. The patent-pending technology underpinning our software was built by two former SpaceX
						engineers &mdash; and rigorously vetted against a threat model focused on nation-state-level attacks
						&mdash; with the vision of defending innocent people from increasingly sophisticated rogue hackers and
						invasive government mass surveillance.
					</p>
					<div class='founder-photos grid-container'>
						<div class='wow desktop-class-bounceInLeft mobile-class-bounceInRight grid-20 prefix-20 suffix-20 tablet-grid-20 tablet-prefix-20 tablet-suffix-20 mobile-grid-100'>
							<span class='mobile-grid-33'><img src='/img/ryan.jpg' alt='Ryan Lester, cofounder of Cyph' /></span>
							<div class='mobile-grid-66 name'>Ryan Lester, CEO</div>
						</div>
						<div class='wow desktop-class-bounceInRight mobile-class-bounceInLeft grid-20 tablet-grid-20 mobile-grid-100'>
							<span class='mobile-grid-33 mobile-push-66'><img src='/img/josh.jpg' alt='Baron Joshua Cyrus Boehm, cofounder of Cyph' /></span>
							<div class='mobile-grid-66 mobile-pull-33 name'>Baron Joshua Cyrus Boehm, COO</div>
						</div>
					</div>
					<p translate>
						Ryan and Josh have been friends for nearly two decades, in that time having spent many
						all-nighters working closely together on various software projects. Most recently, they
						were on the internal software quality team at Elon Musk's SpaceX, where Ryan drove the
						development of next-gen test automation tooling and frameworks while Josh led software
						quality assurance efforts.
					</p>
					<p translate>
						Over the years, the difficulty of communicating privately online had become a constant
						thorn in their side. Existing solutions were largely cumbersome to use, had major
						functional limitations (lack of support for video calling, restrictions to small sets of
						platforms and operating systems, etc.), and often came with "gotchas" that would silently
						compromise confidentiality when one didn't have the expertise to fully understand the tool.
					</p>
					<p translate>
						They knew there could be a better way, so they created Cyph.
					</p>
				</div>
			</section>

			<section id='gettingstarted-section'>
				<h1 class='hero-text' translate>
					Press The Button
				</h1>
				<div class='section-content-container'>
					<p translate>
						The button will take you into the Cyph application, where you'll be given
						a custom shortlink to share with one friend.
					</p>
					<p translate>
						When your friend opens this link, the conversation will begin.
					</p>
				</div>
			</section>

			<section id='pricing' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.pricing' class='unisection'>
				<div id='business'>
					<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='25ms' translate>
						Business Pricing
					</h1>
					<md-icon
						md-font-set='material-icons'
						ng-click='$ctrl.ui.business = false'
						class='back animated fadeIn'
						hide-sm
						hide-xs
					>keyboard_backspace</md-icon>
					<div class='bg-image laptop animated bounceInLeft' flex='20'>
						<img src='/img/business-man.png' />
					</div>
					<div show-sm show-xs flex></div>
					<div layout='row' layout-sm='column' layout-xs='column' layout-align-sm='center center' layout-align-xs='center center' class='pricing-chart animated bounceInUp' flex>
						<div flex></div>
						<br hide-gt-sm />
						<div class='pricing'>
							<h3>Enterprise Custom</h3>

							<div class='features'>
								<p>
									Secure your business with Cyph encryption. Integrate into your app, site, or service with our API and white labeling.
									Work directly with our product development team to create custom features that meet your and your customers' needs.
								<p>

								<div class='feature' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									></md-icon>
									<h4>Beta Features, Plus:</h4>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons desktop-only'
										>arrow_forward</md-icon>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons mobile-only'
										>arrow_downward</md-icon>
								</div>
								<hr>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>people</md-icon>
									<h4>User Management</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>palette</md-icon>
									<h4>Custom Theming</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>domain</md-icon>
									<h4>Self Hosting</h4>
								</div>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>settings</md-icon>
									<h4>API Access</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>bookmark_border</md-icon>
									<h4>White Label</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>edit</md-icon>
									<h4>Custom Features</h4>
								</div>
								<br />
								<hr>
							</div>
							<a href='/contact/b2b'>
								<div class='price'>Contact Us</div>
							</a>
						</div>
						<br hide-gt-sm />
						<div class='pricing'>
							<h3>Early Beta Access</h3>

							<div class='features'>
								<p>
									Get early access to Cyph for your business, as well lifetime priority support. Have a feature you really want to see in Cyph? Your requests are sent straight to the founders.
								</p>
								<br />
								<hr />

								<div class='feature' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>enhanced_encryption</md-icon>
									<h4>Powerful Encryption</h4>
								</div>
								<div class='feature' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>touch_app</md-icon>
									<h4>One Click Access</h4>
								</div>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>chat</md-icon>
									<h4>Instant Messaging</h4>
								</div>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>photo_camera</md-icon>
									<h4>Picture Messaging</h4>
								</div>

								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>videocam</md-icon>
									<h4>Video Calling</h4>
								</div>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>phone</md-icon>
									<h4>Voice Calling</h4>
								</div>
								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>attach_file</md-icon>
									<h4>File Transfers</h4>
								</div>

								<p>Limited Time Offer</p>
								<hr>
								<div class='feature' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>all_inclusive</md-icon>
									<h4>Unlimited Sessions</h4>
								</div>
								<div class='feature' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>live_help</md-icon>
									<h4>Lifetime Priority Support</h4>
								</div>
							</div>

							<div class='price' ng-click='$ctrl.ui.updateCart(
								$ctrl.ui.betaPlan,
								$ctrl.cyph.Config.pricingConfig.categories.enterprise.id,
								$ctrl.cyph.Config.pricingConfig.categories.enterprise.items.beta.id
							)'>\${{$ctrl.ui.betaPlan}} (one time)</div>
						</div>
						<br hide-gt-sm />
						<div class='pricing'>
							<h3>Telehealth Custom</h3>

							<div class='features'>
								<p>
									Expand your client base by allowing virtual doctor visits from anywhere with our HIPAA-compliant encrypted video calling. Securely send and receive patient files.
								<p>

									<div class='feature' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons desktop-only'
										>arrow_back</md-icon>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons mobile-only'
										>arrow_upward</md-icon>
										<h4>Beta Features, Plus:</h4>
									</div>
									<hr>
									<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>local_hospital</md-icon>
										<h4>HIPAA BAA</h4>
									</div>
									<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>schedule</md-icon>
										<h4>Patient Scheduling</h4>
									</div>
									<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>credit_card</md-icon>
										<h4>Payment Processing</h4>
									</div>

								<div class='feature indent' layout='row'>
									<md-icon
										md-font-set='material-icons'
										class='ng-isolate-scope md-default-theme material-icons'
									>settings</md-icon>
									<h4>API Access</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>bookmark_border</md-icon>
									<h4>White Label</h4>
								</div>
								<div class='feature indent' layout='row'>
										<md-icon
											md-font-set='material-icons'
											class='ng-isolate-scope md-default-theme material-icons'
										>edit</md-icon>
									<h4>Custom Features</h4>
								</div>
								<br />
								<hr>
							</div>

							<a href='/contact/telehealth'>
								<div class='price'>Contact Us</div>
							</a>
							</div>
							<br hide-gt-sm />
						<div flex></div>
						<div class='bg-image doctor animated bounceInRight' flex='20'>
								<img src='/img/doctor.png' />
						</div>
					</div>
				</div>
			</section>

			<section id='error' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.error' class='unisection'>
				<div>
					<h1 translate>I'm sorry, but your cyph is in another castle...</h1>
				</div>
				<img src='/img/404.png' alt='Funny Mario reference' />
				<div id='errorExplanation'>
					<p translate>Reasons why you may have landed here:</p>
					<ul>
						<li translate>
							A glitch in the matrix
						</li>
						<li translate>
							You're just guessing random URLs
						</li>
						<li translate>
							We broke something
						</li>
					</ul>
				</div>
			</section>

			<section id='contact' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.contact' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Contact Us
				</h1>
				<div class='section-content-container'>
					<p>
						<cyph-contact self='$ctrl.ui.contactState'></cyph-contact>
					</p>
					<p>
						<span translate>
							If you prefer to use your own email client, feel free to shoot us a message at
						</span>
						<a href='mailto:hello@cyph.com' title='hello@cyph.com'>hello@cyph.com</a>.
					</p>
					<p>
						<span translate>
							We also have a phone line open for voicemail:
						</span>
						<a href='tel:+19312974462' title='+1(931) 297 4462'>+1(931) CYPH INC</a>.
					</p>
				</div>
			</section>

			<section id='donate' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.donate' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Donate
				</h1>
				<div class='section-content-container'>
					<div>
						<span translate>
							If you'd like to help support our mission, you may donate
							via the form below or use the Bitcoin address
						</span>
						<a
							target='_self'
							href='bitcoin:1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd'
						>1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd</a>.
						<p translate>
							All donations will go directly toward the development of native mobile apps and
							Cyph accounts.
						</p>
						<md-slider
							class='donation'
							flex
							md-discrete
							ng-model='$ctrl.ui.donationAmount'
							step='1'
							min='1'
							max='1337'
							aria-label='Donation Amount'
						></md-slider>
						<div flex='20' class='donation' layout layout-align='center center'>
							\${{$ctrl.ui.donationAmount}}
						</div>
						<md-button class='donate-button' aria-label='Submit Donation'>
							<a translate ng-click='$ctrl.ui.updateCart(
								$ctrl.ui.donationAmount,
								$ctrl.cyph.Config.pricingConfig.categories.donation.id,
								$ctrl.cyph.Config.pricingConfig.categories.donation.items.generic.id
							)'>
								Confirm Donation Amount
							</a>
						</md-button>
					</div>
				</div>
			</section>

			<section id='checkout' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.checkout' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Checkout
				</h1>
				<div layout='row' layout-align='center center'>
					<div
						flex='33'
						flex-sm='80'
						flex-xs='95'
						class='cart'
						ng-class='{"empty" : $ctrl.ui.cart}'
						ng-hide='$ctrl.ui.cart'
					>
						<h3 translate> There's nothing in your cart. What are you even doing here?</h3>
						<br />
						<span translate> To add something to your cart go to </span>
						<a href='/pricing'> Business Pricing </a>
						<span translate> or </span>
						<a href='/donate'> make a donation </a>
						.
					</div>
					<cyph-checkout
						flex='33'
						flex-sm='80'
						flex-xs='95'
						amount='$ctrl.ui.cart[0]'
						category='$ctrl.ui.cart[1]'
						item='$ctrl.ui.cart[2]'
						ng-if='$ctrl.ui.cart[0] !== 0'
					>
						<div ng-if='$ctrl.ui.cart[1] === $ctrl.cyph.Config.pricingConfig.categories.donation.id'>
							Thank you for supporting Cyph!
						</div>
						<div ng-hide='$ctrl.ui.cart[1] === $ctrl.cyph.Config.pricingConfig.categories.donation.id'>
							Payment confirmed! Follow-up instructions will be sent via email.
						</div>
					</cyph-checkout>
				</div>
			</section>

			<section id='faq' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.faq' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Frequently Asked Questions
				</h1>
				<div class='section-content-container' layout='row' layout-align='center center'>
					<div class='md-padding' flex='75' flex-xs='95' layout='column'>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How do I use Cyph?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p>
									<span translate>Simply go to</span>
									<a ng-href='{{$ctrl.cyph.Env.newCyphUrl}}'>cyph.im</a>
									<span translate>
										or click the "start new cyph" button and a cyph link will be generated
										for you to send to a friend. Text, email, or send the link to them via
										any other channel, and when they click it you both will enter a secure
										chat.
									</span>
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How do I send photos?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Click the castle icon in the message composition textbox, click the photo icon, and then select the photo you wish
									to share.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How do I send files?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Click the castle icon in the message composition textbox, click the paperclip icon, and then select the file you wish
									to share. Note: sending and reveiving files requires a WebRTC-compatible browser. We recommend Chrome or Firefox.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How do I start a video or voice call?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Click the castle icon in the message composition textbox, then click the video (or phone) icon.
									A warning will pop up confirming that you wish to send the call invite and
									that connecting will expose your IP (Cyph video uses a peer-to-peer connection
									for voice and video, so you will be connecting directly to the other party
									instead of going through our servers).
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										What data do you track?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Currently, we only track numbers of: cyph sessions, messages, timeouts,
									voice/video calls, file transfers, signups, "cyphertext" UI views, and calls
									to our API.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How much does Cyph cost?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p>
									<span translate>
										The Cyph beta is free to use for individuals (we intend to always have a
										free tier, because we see online privacy as a basic right) and we are
										currently piloting
									</span>
									<a href='/pricing' translate>enterprise deployments of secure video and instant messaging</a>.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										Do you have an Android/iOS/TI-89 app?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Native chat applications for Android and iOS are in the works.
									We have no plans to support any Texas Instruments machines.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										Why do I keep getting the "I'm sorry,
										but your cyph is in another castle" screen?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									Common reasons for landing on this page are: the cyph URL has been
									opened more than once (only the first person who clicks it is allowed
									into the chat) or the cyph link has already expired.
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										Has there been a third-party security audit of Cyph?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p>
									<span translate>Yes,</span>
									<a
										href='https://cure53.de'
										rel='noreferrer'
										target='_blank'
										translate
									>Cure53</a>
									<span translate>
										recently completed their audit of Cyph and concluded that "No
										major issues in regards to application security or cryptographic
										implementations could be spotted in spite of a thorough audit."
									</span>
									<a
										href='https://cure53.de/pentest-report_cyph.pdf'
										rel='noreferrer'
										target='_blank'
										translate
									>[Complete Cure53 Pentest Report]</a>
									<span translate>A postmortem analysis will be posted on our blog soon.</span>
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										How can I support Cyph?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p translate>
									<span translate>
										One of the best ways you can support Cyph is by using it with your
										friends and talking about us on social media. You can also
									</span>
									<a translate href='/contact/feedback'>give feedback</a>
									<span translate>or</span>
									<a translate href='/donate'>donate</a>
									<span translate>
										to the cause. All donations will go towards the development and
										growth of Cyph.
									</span>
								</p>
							</md-card-content>
						</md-card>
						<md-card>
							<md-card-header>
								<md-card-header-text>
									<span class='md-title' translate>
										What should I do if I encounter a bug?
									</span>
								</md-card-header-text>
							</md-card-header>
							<md-card-content>
								<p>
									<span translate>Please contact us at</span>
									<a href='/contact/bugs'>bugs@cyph.com</a>;
									<span translate>
										our team generally has pretty fast response time. If you can,
										please include any steps to reproduce or other relevant information.
									</span>
								</p>
							</md-card-content>
						</md-card>
					</div>
				</div>
			</section>

			<section id='termsofservice' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.termsofservice' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Terms of Service
				</h1>
				<div class='section-content-container'>
					<ol>
						<li>
							<strong translate>Terms</strong>
							<p translate>
								By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trade mark law.
							</p>
						</li>
						<li>
							<strong translate>Use License</strong>
							<ol type='a'>
								<li translate>
									<p translate>
										Permission is granted to temporarily download one copy of the materials (information or software) on Cyph's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
									</p>
									<ol type='i'>
										<li translate>
											modify or copy the materials;
										</li>
										<li translate>
											use the materials for any commercial purpose, or for any public display (commercial or non-commercial);
										</li>
										<li translate>
											attempt to decompile or reverse engineer any software contained on Cyph's website;
										</li>
										<li translate>
											remove any copyright or other proprietary notations from the materials; or
										</li>
										<li translate>
											transfer the materials to another person or "mirror" the materials on any other server.
										</li>
									</ol>
								</li>
								<li translate>
									This license shall automatically terminate if you violate any of these restrictions and may be terminated by Cyph at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.
								</li>
							</ol>
						</li>
						<li>
							<strong translate>Refund Policy</strong>
							<p translate>
								Unless a specific exception is made by Cyph, refunds will not be granted on any payments made to Cyph.
							</p>
						</li>
						<li>
							<strong translate>Disclaimer</strong>
							<p translate>
								The materials on Cyph's website are provided "as is". Cyph makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties, including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights. Further, Cyph does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its Internet website or otherwise relating to such materials or on any sites linked to this site.
							</p>
						</li>
						<li>
							<strong translate>Limitations</strong>
							<p translate>
								In no event shall Cyph or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption,) arising out of the use or inability to use the materials on Cyph's Internet site, even if Cyph or a Cyph authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.
							</p>
						</li>
						<li>
							<strong translate>Revisions and Errata</strong>
							<p translate>
								The materials appearing on Cyph's website could include technical, typographical, or photographic errors. Cyph does not warrant that any of the materials on its website are accurate, complete, or current. Cyph may make changes to the materials contained on its website at any time without notice. Cyph does not, however, make any commitment to update the materials.
							</p>
						</li>
						<li>
							<strong translate>Links</strong>
							<p translate>
								Cyph has not reviewed all of the sites linked to its Internet website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Cyph of the site. Use of any such linked website is at the user's own risk.
							</p>
						</li>
						<li>
							<strong translate>Site Terms of Use Modifications</strong>
							<p translate>
								Cyph may revise these terms of use for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these Terms and Conditions of Use.
							</p>
						</li>
						<li>
							<strong translate>Governing Law</strong>
							<p translate>
								Any claim relating to Cyph's website shall be governed by the laws of the State of VA without regard to its conflict of law provisions.
							</p>
						</li>
					</ol>
				</div>
			</section>

			<section id='privacypolicy' ng-if='$ctrl.ui.state === $ctrl.cyph.com.States.privacypolicy' class='unisection'>
				<h1 class='hero-text wow animated fadeInDownBig' data-wow-delay='420ms' translate>
					Privacy Policy
				</h1>
				<div class='section-content-container'>
					<p translate>
						Privacy is what Cyph is all about, so your privacy is very important to us! Accordingly, we have developed this Policy in order for you to understand how we collect, use, communicate and disclose and make use of personal information. The following outlines our privacy policy.
					</p>
					<ul>
						<li translate>
							Before or at the time of collecting any personal information, we will identify the purposes for which information is being collected.
						</li>
						<li translate>
							We will collect and use of personal information only when necessary, solely with the objective of fulfilling those purposes specified by us and for other compatible purposes, unless we obtain the consent of the individual concerned or as required by law.
						</li>
						<li translate>
							We will only retain personal information as long as necessary for the fulfillment of those purposes.
						</li>
						<li translate>
							We will protect personal information by security safeguards against loss or theft, as well as unauthorized access, disclosure, copying, use or modification.
						</li>
						<li translate>
							We collect and use limited data with Google Analytics on our corporate site (cyph.com), as well as in a sandboxed iframe for cyph.im (the Cyph application), which then self-destructs after 10 seconds. Our backend logs the total number cyphs started, number of messages sent, beta-list sign-ups, and incoming requests.
						</li>
						<li translate>
							We do not and will never view, log, or transfer plaintext versions of your encrypted data, nor the private keys and mutually shared secrets needed in order to decipher them.
						</li>
						<li translate>
							We have not been approached by any agency, government or otherwise, with a request to backdoor our code. We are currently working on implementing a better warrant canary system.
						</li>
					</ul>
					<p translate>
						We are committed to conducting our business in accordance with these principles in order to ensure that the confidentiality of personal information is protected and maintained.
					</p>
					<p>
						<span translate>If you have any questions about our policy, please email us at</span>
						<a href='/contact/privacy' translate>privacy@cyph.com</a>.
					</p>
				</div>
			</section>

			<footer id='footer'>
				<div class='footer-info'>
					&copy; Cyph 2016
						&nbsp;&nbsp;&nbsp;
					<span translate>(Patents Pending)</span>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
					<a href='/contact'>Contact</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
					<a href='/donate'>Donate</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
					<a href='/privacypolicy'>Privacy Policy</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
					<a href='/termsofservice'>Terms of Service</a>
				</div>
			</footer>
		</section>
	`,

	invite: `
		<md-dialog class='register' flex='65' flex-sm='80' flex-xs='95'>
			<md-content>
				<md-card class='md-padding'>
					<md-card-title>
						<md-card-title-text>
							<span class='md-headline' translate>
								Register with Invite Code
							</span>
							<span class='md-subhead'>
								<div ng-show='locals.signupForm.state === 1'>
									Enter your email address and invite code for priority access on our waitlist.
								</div>
								<div ng-show='locals.signupForm.state === 2'>
									Thanks for signing up. Feel free to give us your name too.
									Privacy is at the core of our ideology, so we'll never give
									away your email address or personal details.
								</div>
							</span>
						</md-card-title-text>
					</md-card-title>
					<md-card-content>
						<cyph-signup-form self='locals.signupForm' invite='true'></cyph-signup-form>
					</md-card-content>
				</md-card>

				<div class='login-button' layout='row' layout-align='center center'>
					<md-button
						ng-href='{{locals.cyph.Env.newCyphBaseUrl}}#beta/login'
						translate
					>
						Already have a Cyph account? Click here to login.
					</md-button>
				</div>
			</md-content>
		</md-dialog>
	`,

	linkConnection: `
		<div
			class='link-connection loading'
			layout='column'
			layout-fill
			flex
		>
			<div flex></div>
			<div class='logo-animation'>
				<img src='/img/logo.animated.gif' alt='Animated Cyph logo' />
			</div>
			<div>
				<div ng-show='$ctrl.self.isPassive' translate>
					Waiting for friend to join...
				</div>
				<div ng-hide='$ctrl.self.isPassive'>
					<div translate>
						Send the link below to someone else. When they open it, you'll be securely connected!
					</div>
					<br />

					<md-input-container class='connect-link-input desktop-only'>
						<input translate ng-model='$ctrl.self.link' aria-label='Cyph link' />
						<md-button class='copy' ng-click='$ctrl.self.copyToClipboard()'>
							<i class='material-icons'>content_copy</i>
						</md-button>
					</md-input-container>

					<div class='connect-link-mobile mobile-only'>
						<a
							class='connect-link-link'
							ng-href='{{$ctrl.self.link}}'
						>{{$ctrl.self.link}}</a>
						<br />

						<md-button
							translate
							class='md-fab'
							aria-label='SMS'
							ng-href='{{$ctrl.cyph.Env.smsUriBase}}{{$ctrl.self.linkEncoded}}'
						>
							<img src='/img/icons/sms.png' alt='SMS' />
						</md-button>

						<span class='divider'>
							&nbsp;
						</span>

						<md-button
							translate
							class='md-fab'
							aria-label='Email'
							target='_self'
							ng-href='mailto:?body={{$ctrl.self.linkEncoded}}'
						>
							<img src='/img/icons/email.png' alt='Email' />
						</md-button>
					</div>
				</div>

				<br />
				<div>
					<span translate>
						Link expires in
					</span>
					<span class='countdown'>
						{{$ctrl.self.timer.timestamp}}
					</span>
					<md-button
						ng-click='$ctrl.self.addTime(30000)'
						aria-label='Increase Time by 30 seconds'
					>
						<i class='material-icons'>alarm_add</i>
					</md-button>
				</div>
			</div>

			<md-switch
				class='advanced-features-switch'
				ng-model='$ctrl.self.advancedFeatures'
				aria-label='Advanced Features'
			>
				Advanced Features
			</md-switch>

			<div class='advanced-features' ng-show='$ctrl.self.advancedFeatures'>
				<md-input-container class='queued-message-box'>
					<label>Queue up first message</label>
					<textarea
						rows='3'
						ng-model='$ctrl.queuedMessageDraft'
					></textarea>
				</md-input-container>
				<div class='buttons'>
					<md-button
						ng-click='$ctrl.self.chat.setQueuedMessage(
							$ctrl.queuedMessageDraft
						)'
					>
						<i class='material-icons'>save</i>
					</md-button>
					<md-button
						class='self-destruct-button'
						ng-click='$ctrl.self.chat.setQueuedMessage(
							undefined,
							!$ctrl.self.chat.queuedMessageSelfDestruct
						)'
					>
						<i
							class='material-icons'
							ng-class='{
								"active": $ctrl.self.chat.queuedMessageSelfDestruct === true
							}'
						>
							timer
						</i>
					</div>
			</div>
			<div flex></div>
		</div>
	`,

	register: `
		<md-dialog class='register' flex='65' flex-sm='80' flex-xs='95'>
			<md-content>
				<md-card class='md-padding'>
					<md-card-title>
						<md-card-title-text>
							<span class='md-headline' translate>
								Register
							</span>
							<span class='md-subhead'>
								<div ng-show='locals.signupForm.state === 1'>
									Enter your email address.
								</div>
								<div ng-show='locals.signupForm.state === 2'>
									Thanks for signing up. Feel free to give us your name too.
									Privacy is at the core of our ideology, so we'll never give
									away your email address or personal details.
								</div>
							</span>
						</md-card-title-text>
					</md-card-title>
					<md-card-content>
						<cyph-signup-form self='locals.signupForm'></cyph-signup-form>
					</md-card-content>
				</md-card>

				<div class='login-button' layout='row' layout-align='center center'>
					<md-button
						ng-href='{{locals.cyph.Env.newCyphBaseUrl}}#beta/login'
						translate
					>
						Already have a Cyph account? Click here to login.
					</md-button>
				</div>
			</md-content>
		</md-dialog>
	`,

	signupForm: `
		<div class='beta-signup-form'>
			<form ng-submit='$ctrl.self.submit()' ng-show='$ctrl.self.state === 0'>
				<div layout='row' layout-align='center center' flex>
					<ng-transclude></ng-transclude>
				</div>
				<div layout='row' layout-align='center stretch' flex>
					<div class='desktop-only' layout='column' flex='50'>
						<div layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='email' ng-model='$ctrl.self.data.email' aria-label='Email' />
								<label>Email</label>
							</md-input-container>
						</div>
						<div layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='password' aria-label='Password' disabled />
								<label>Password</label>
							</md-input-container>
						</div>

						<div layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='password' aria-label='Confirm Password' disabled />
								<label>Confirm Password</label>
							</md-input-container>
						</div>
						<div ng-if='$ctrl.invite' layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='text' ng-model='$ctrl.self.data.inviteCode' aria-label='Invite Code' />
								<label>Invite Code</label>
							</md-input-container>
						</div>
						<div class='register-button' layout='row' layout-align='center end'>
							<md-button
								type='submit'
								aria-label='Register'
								ng-disabled='true'
								translate
							>
								Register
							</md-button>
						</div>
					</div>
					<div layout='column' flex>
						<div layout='row' layout-align='center center'>
							<p flex='80' translate>
								We are currently at capacity and registration is closed,
								but you can sign up for the waitlist to reserve your spot
								in line for an account.
							</p>
						</div>
						<div layout='row' layout-align='center center'>
							<p flex='80' translate>
								However, you don't need an account to use Cyph; just click the "start
								new cyph" button on the homepage. Our beta accounts program only provides
								early access to more advanced functionality and cool new features.
							</p>
							<br />
						</div>
						<div class='register-button' layout='row' layout-align='center end'>
							<md-button
								type='submit'
								aria-label='Waitlist Signup'
								translate
							>
								Waitlist Signup
							</md-button>
						</div>
					</div>
				</div>
			</form>

			<form ng-submit='$ctrl.self.submit()' ng-show='$ctrl.self.state === 1'>
				<div layout='row' layout-align='center center' flex>
					<div layout='column' flex>
						<div layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='email' ng-model='$ctrl.self.data.email' aria-label='Email' required />
								<label>Email</label>
							</md-input-container>
						</div>
						<div layout='row' ng-if='$ctrl.invite' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input type='text' ng-model='$ctrl.self.data.inviteCode' aria-label='Invite Code' required />
								<label>Invite Code</label>
							</md-input-container>
						</div>
						<div layout='row' layout-align='center end'>
							<md-button
								type='submit'
								aria-label='Waitlist Signup'
								translate
							>
								Waitlist Signup
							</md-button>
						</div>
					</div>
				</div>
			</form>

			<form ng-submit='$ctrl.self.submit()' ng-show='$ctrl.self.state === 2'>
				<div layout='row' layout-align='center center' flex>
					<div layout='column' flex>
						<div layout='row' layout-align='center center'>
							<md-input-container class='md-block' flex='80'>
								<input ng-model='$ctrl.self.data.name' aria-label='Name' />
								<label>Name (optional)</label>
							</md-input-container>
						</div>
						<div layout='row' layout-align='center end'>
							<md-button
								type='submit'
								aria-label='Waitlist Signup'
								translate
							>
								Waitlist Signup
							</md-button>
						</div>
					</div>
				</div>
			</form>

			<form ng-submit='$ctrl.self.submit()' ng-show='$ctrl.self.state === 3'>
				<div layout='row' layout-align='center center' flex>
					<div layout='column' flex>
						<div layout='row' layout-align='center center'>
							<p flex='80' translate>
								Thanks for subscribing, {{$ctrl.self.data.name}}! We'll email you
								when your invite is ready.
							</p>
						</div>
					</div>
				</div>
			</form>
		</div>
	`,

	staticCyphNotFound: `
		<md-content
			class='cyph-not-found nano'
			layout='column'
			layout-fill
			flex
		>
			<div class='nano-content'>
				<div>
					<h1 translate>
						I'm sorry, but your cyph is in another castle...
					</h1>
				</div>
				<img src='/img/404.png' alt='Funny Mario reference' />
				<div class='explanation'>
					<p>
						<span translate>Please</span>
						<a
							translate
							target='_self'
							ng-href='{{$ctrl.cyph.Env.newCyphUrl}}'
						>try again</a>.
					</p>
					<p translate>Reasons why you may have landed here:</p>
					<ul>
						<li translate>
							The cyph you're looking for has expired
						</li>
						<li translate>
							The cyph you're looking for has already been connected to
							(someone else got there first, or you clicked twice)
						</li>
						<li translate>
							A glitch in the matrix
						</li>
						<li translate>
							You're just guessing random URLs
						</li>
						<li translate>
							We broke something
						</li>
					</ul>
				</div>
			</div>
		</md-content>
	`,

	staticCyphSpinningUp: `
		<div
			class='cyph-spinning-up loading'
			layout='column'
			layout-fill
			flex
		>
			<div flex></div>
			<div class='logo-animation'>
				<img src='/img/logo.animated.gif' alt='Animated Cyph logo' />
			</div>
			<div translate>Now spinning up your cyph room...</div>
			<div flex></div>
		</div>
	`,

	staticFooter: `
		<div layout='row' flex class='footer desktop-only'>
			<div flex></div>

			<div layout='row' ng-hide='$ctrl.ui.coBranded'>
				<p flex='nogrow' layout-padding>
					<a flex ng-href='{{$ctrl.cyph.Env.homeUrl}}'>
						© Cyph 2016 (Patents Pending)
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a flex ng-href='{{$ctrl.cyph.Env.homeUrl}}contact'>Contact</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{$ctrl.cyph.Env.homeUrl}}donate'>
						Donate
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<strong ng-hide='$ctrl.ui.chat.session.state.wasInitiatedByAPI'>
						- Individual Use Only -
					</strong>
					<strong ng-show='$ctrl.ui.chat.session.state.wasInitiatedByAPI'>
						- Cyph API -
					</strong>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{$ctrl.cyph.Env.homeUrl}}pricing'>
						Business Pricing
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{$ctrl.cyph.Env.homeUrl}}privacypolicy'>
						Privacy Policy
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{$ctrl.cyph.Env.homeUrl}}termsofservice'>
						Terms of Service
					</a>
				</p>
			</div>

			<div layout='row' ng-show='$ctrl.ui.coBranded'>
				<p class='powered-by-cyph' flex='nogrow' layout-padding>
					<a ng-href='{{$ctrl.cyph.Env.homeUrl}}' class='small-font'>
						Powered by Cyph
					</a>
				</p>
			</div>

			<div flex></div>
		</div>
	`
};


/*
(() => {
	for (let k of Object.keys(Templates)) {
		Templates[k]	= Util.translateHtml(Templates[k]);
	}
})();
*/
