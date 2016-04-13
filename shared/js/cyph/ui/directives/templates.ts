namespace Cyph {
	export namespace UI {
		export namespace Directives {
			/**
			 * Reusable HTML view templates for component directives.
			 */
			export const Templates	= {
				chatCyphertext: `
					<div class='chat-cyphertext nano'>
						<md-content class='nano-content'>
							<md-list layout='column'>
								<md-item
									class='message-item unread'
									ng-repeat='message in $this.cyphertext.messages'
									layout='horizontal'
								>
									<span class='message'>
										<strong
											translate
											ng-bind='::(
												message.author === Cyph.Session.Users.me ?
													"me" :
													"friend"
											) + ": "'
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
							ng-click='$this.cyphertext.hide()'
						>
							<strong>&times;</strong>
						</md-button>
					</div>
				`,

				chatMain: `
					<div
						class='chat-main platform-container'
						ng-class='{
							video: $this.p2pManager.isInUse(),
							mobile: $this.isMobile
						}'
						layout='column'
						layout-fill
						flex
					>
						<div
							ng-view
							class='loading'
							layout='column'
							layout-fill
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.keyExchange
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
								ng-value='$this.keyExchangeProgress'
							></md-progress-linear>
							<div flex></div>
						</div>

						<div
							ng-view
							class='abort-screen loading'
							layout='column'
							layout-fill
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.aborted
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
									ng-href='{{Cyph.Env.newCyphUrl}}'
								>try again</a>.
							</div>
							<div flex></div>
						</div>

						<div
							ng-view
							class='chat-begin-message'
							layout='column'
							layout-fill
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.chatBeginMessage
							}'
						>
							<div flex></div>
							<div translate>Connected!</div>
							<div flex></div>
						</div>

						<div
							ng-view
							class='video-call'
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.chat,
								playing: $this.p2pManager.isPlaying()
							}'
						>
							<a class='logo' rel='noreferrer' ng-href='{{Cyph.Env.homeUrl}}'>
								<img src='/img/betalogo.mobile.png' alt='Beta logo' />
							</a>
							<video
								class='friend stream'
								ng-show='$this.p2pManager.p2p.incomingStream.video'
								autoplay
							></video>
							<video
								class='friend'
								ng-hide='
									$this.p2pManager.p2p.incomingStream.video ||
									$this.p2pManager.p2p.incomingStream.loading
								'
								ng-attr-src='{{
									$this.p2pManager.isPlaying() ?
										Cyph.Env.p2pVoiceCallVideo :
										" "
								}}'
								autoplay
								loop
								muted
							></video>
							<video
								class='me'
								ng-show='$this.p2pManager.p2p.outgoingStream.video'
								autoplay
								muted
							></video>

							<md-progress-circular
								ng-show='$this.p2pManager.p2p.incomingStream.loading'
								md-mode='indeterminate'
							></md-progress-circular>

							<div
								class='progress'
								ng-show='$this.p2pManager.p2p.outgoingFile.name'
							>
								<span translate>Sending</span>
								<span>
									{{$this.p2pManager.p2p.outgoingFile.name}}
									({{$this.p2pManager.p2p.outgoingFile.readableSize}}):
								</span>
								<md-progress-linear
									md-mode='determinate'
									value='{{$this.p2pManager.p2p.outgoingFile.percentComplete}}'
								></md-progress-linear>
							</div>

							<div
								class='progress'
								ng-show='$this.p2pManager.p2p.incomingFile.name'
							>
								<span translate>Receiving</span>
								<span>
									{{$this.p2pManager.p2p.incomingFile.name}}
									({{$this.p2pManager.p2p.incomingFile.readableSize}}):
								</span>
								<md-progress-linear
									md-mode='determinate'
									value='{{$this.p2pManager.p2p.incomingFile.percentComplete}}'
								></md-progress-linear>
							</div>

							<md-button
								translate
								class='sidebar'
								aria-label='Sidebar'
								ng-click='$this.p2pManager.toggleSidebar()'
							>
								<img src='/img/icons/chat.png' alt='Chat' />
							</md-button>

							<div class='buttons'>
								<md-button
									translate
									class='md-fab video-call-button'
									ng-click='$this.p2pManager.videoCallButton()'
									ng-attr-aria-label='{{
										!$this.p2pManager.p2p.outgoingStream.video ?
											"Enable Camera" :
											"Disable Camera"
									}}'
								>
									<img
										ng-show='
											!$this.p2pManager.isActive ||
											!$this.p2pManager.p2p.outgoingStream.video
										'
										src='/img/icons/video.on.png'
										alt='Video on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.video
										'
										src='/img/icons/video.off.png'
										alt='Video off'
									/>
								</md-button>
								<md-button
									translate
									class='md-fab voice-call-button'
									ng-click='$this.p2pManager.voiceCallButton()'
									ng-attr-aria-label='{{
										!$this.p2pManager.p2p.outgoingStream.audio ?
											"Enable Mic" :
											"Disable Mic"
									}}'
								>
									<img
										ng-show='!$this.p2pManager.isActive'
										src='/img/icons/voice.on.png'
										alt='Voice on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											!$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.on.png'
										alt='Mic on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.off.png'
										alt='Mic off'
									/>
								</md-button>
								<md-button
									translate
									class='md-fab send-file-button'
									ng-disabled='$this.p2pManager.p2p.outgoingFile.name'
									aria-label='Send File'
								>
									<img src='/img/icons/file.png' alt='File' />
									<input
										type='file'
										cyph-filechange='$this.p2pManager.sendFileButton()'
									/>
								</md-button>
								<md-button
									translate
									aria-label='End Call'
									class='md-fab md-theme-grey close-button'
									ng-click='$this.p2pManager.closeButton()'
								>
									<strong>&times;</strong>
								</md-button>
							</div>
						</div>

						<div
							class='video-call-message-box'
							cyph-chat-message-box='$this'
						></div>

						<div
							ng-view
							class='message-list nano'
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.chat
							}'
						>
							<md-content class='nano-content'>
								<md-list layout='column'>
									<md-item
										class='message-item unread'
										ng-class='::"author-" + Cyph.Session.Users[message.author]'
										ng-repeat='message in $this.messages'
										layout='horizontal'
									>
										<span class='message'>
											<strong
												translate
												class='message-author'
												ng-hide='::message.author === Cyph.Session.Users.app'
												ng-bind='::(
													message.author === Cyph.Session.Users.me ?
														"me" :
														"friend"
												) + ": "'
											></strong>
											<span
												class='message-text'
												cyph-markdown='::message.text'
												ng-class='::{
													"app-message":
														message.author === Cyph.Session.Users.app
												}'
											></span>
										</span>
										<span flex class='message-timestamp'>
											<span
												class='mobile-only'
												ng-show='::message.author === Cyph.Session.Users.me'
											>
												<span translate>me</span> &nbsp;&mdash;&nbsp;
											</span>

											{{::message.timestamp}}

											<span
												class='mobile-only'
												ng-show='::message.author === Cyph.Session.Users.friend'
											>
												&nbsp;&mdash;&nbsp; <span translate>friend</span>
											</span>
										</span>
									</md-item>

									<md-item
										class='friend-is-typing'
										ng-class='{"show": $this.isFriendTyping}'
									>
										<span class='ellipsis-spinner'>
											<div class='bounce1'></div>
											<div class='bounce2'></div>
											<div class='bounce3'></div>
										</span>
									</md-item>

									<div ng-show='$this.isDisconnected'>
										<ng-transclude></ng-transclude>
									</div>
								</md-list>
							</md-content>
						</div>
					</div>
				`,

				chatMessageBox: `
					<div
						class='chat-message-box platform-container'
						ng-class='{mobile: $this.isMobile}'
						ng-show='
							$this.state === Cyph.UI.Chat.States.chat &&
							$this.session.state.isAlive
						'
					>
						<textarea
							translate
							class='message-box tabIndent'
							ng-model='$this.currentMessage'
							ng-trim='false'
							ng-change='$this.messageChange()'
							cyph-enterpress='$this.send()'
							enterpress-only='desktop'
							placeholder='Send a secure message...'
						></textarea>

						<md-button
							translate
							class='send-button mobile-only'
							ng-class='{
								"chat-message-box-hidden": $this.currentMessage === ""
							}'
							ng-click='$this.send()'
							aria-label='Send'
						>
							<img src='/img/icons/send.png' alt='Send' />
						</md-button>

						<md-button
							translate
							class='insert-photo-mobile mobile-only'
							ng-class='{"chat-message-box-hidden": $this.currentMessage !== ""}'
							aria-label='Insert Photo'
						>
							<img src='/img/icons/insertphoto.grey.png' alt='Insert photo grey' />
							<input
								accept='image/*'
								type='file'
								cyph-filechange='$this.photoManager.insert(this)'
							/>
						</md-button>

						<md-button
							translate
							class='insert-photo-desktop md-fab desktop-only'
							ng-class='{"chat-message-box-hidden": $this.currentMessage !== ""}'
							aria-label='Insert Photo'
						>
							<img src='/img/icons/insertphoto.png' alt='Insert photo' />
							<input
								accept='image/*'
								type='file'
								cyph-filechange='$this.photoManager.insert(this)'
							/>
						</md-button>

						<md-subheader
							class='new-messages md-subheader-colored md-sticky-clone'
							ng-show='$this.scrollManager.unreadMessages > 0'
							sticky-state='active'
							ng-click='$this.scrollManager.scrollDown()'
						>
							<strong>&#8595;&nbsp;&nbsp;</strong>
							<span
								translate
								ng-bind='
									$this.scrollManager.unreadMessages +
									" " + "new" + " " +
									(
										$this.scrollManager.unreadMessages > 1 ?
											"messages" :
											"message"
									)
								'
							></span>
						</md-subheader>
					</div>
				`,

				chatSidebar: `
					<div
						class='chat-sidebar'
						ng-class='{
							"show-chat": showChat && $this.state === Cyph.UI.Chat.States.chat
						}'
					>
						<a class='logo' rel='noreferrer' ng-href='{{Cyph.Env.homeUrl}}'>
							<img src='/img/betalogo.png' alt='Beta logo' />
						</a>
						<div ng-show='showChat && $this.state === Cyph.UI.Chat.States.chat'>
							<md-button
								translate
								aria-label='Show Cyphertext'
								ng-click='$this.cyphertext.show()'
							>
								Show Cyphertext
							</md-button>
							<md-button
								translate
								aria-label='Formatting Help'
								ng-click='$this.formattingHelpButton()'
							>
								Formatting Help
							</md-button>
							<md-button
								translate
								aria-label='Disconnect'
								ng-disabled='!$this.session.state.isAlive'
								ng-click='$this.disconnectButton()'
							>
								Disconnect
							</md-button>

							<div
								class='p2p-section'
								ng-click='$this.p2pManager.disabledAlert()'
								ng-attr-title='{{
									$this.isConnected && !$this.p2pManager.isEnabled ?
										Cyph.Strings.p2pDisabled :
										""
								}}'
							>
								<md-button
									translate
									class='md-fab video-call-button'
									ng-disabled='
										!$this.p2pManager.isEnabled ||
										!$this.isConnected ||
										!$this.session.state.isAlive
									'
									ng-click='$this.p2pManager.videoCallButton()'
									ng-attr-aria-label='{{
										!$this.p2pManager.isActive ?
											"Video Call" :
											!$this.p2pManager.p2p.outgoingStream.video ?
												"Enable Camera" :
												"Disable Camera"
									}}'
								>
									<img
										ng-show='
											!$this.p2pManager.isActive ||
											!$this.p2pManager.p2p.outgoingStream.video
										'
										src='/img/icons/video.on.png'
										alt='Video on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.video
										'
										src='/img/icons/video.off.png'
										alt='Video off'
									/>
								</md-button>
								<md-button
									translate
									class='md-fab voice-call-button'
									ng-disabled='
										!$this.p2pManager.isEnabled ||
										!$this.isConnected ||
										!$this.session.state.isAlive
									'
									ng-click='$this.p2pManager.voiceCallButton()'
									ng-attr-aria-label='{{
										!$this.p2pManager.isActive ?
											"Voice Call" :
											!$this.p2pManager.p2p.outgoingStream.audio ?
												"Enable Mic" :
												"Disable Mic"
									}}'
								>
									<img
										ng-show='!$this.p2pManager.isActive'
										src='/img/icons/voice.on.png'
										alt='Voice on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											!$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.on.png'
										alt='Mic on'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.off.png'
										alt='Mic off'
									/>
								</md-button>
								<md-button
									translate
									class='md-fab send-file-button'
									ng-disabled='
										$this.p2pManager.p2p.outgoingFile.name ||
										!$this.p2pManager.isEnabled ||
										!$this.isConnected ||
										!$this.session.state.isAlive
									'
									aria-label='Send File'
								>
									<img src='/img/icons/file.png' alt='File' />
									<input
										type='file'
										cyph-filechange='$this.p2pManager.sendFileButton()'
									/>
								</md-button>
							</div>
						</div>
					</div>
				`,

				chatToolbar: `
					<div>
						<md-toolbar class='chat-toolbar'>
							<div class='md-toolbar-tools'>
								<a class='logo' rel='noreferrer' ng-href='{{Cyph.Env.homeUrl}}'>
									<img src='/img/betalogo.mobile.png' alt='Beta logo' />
								</a>

								<span flex></span>

								<span ng-show='showChat && $this.state === Cyph.UI.Chat.States.chat'>
									<span ng-click='$this.p2pManager.disabledAlert()'>
										<md-button
											translate
											class='video-call-button'
											ng-disabled='
												!$this.p2pManager.isEnabled ||
												!$this.isConnected ||
												!$this.session.state.isAlive
											'
											ng-click='$this.p2pManager.videoCallButton()'
											ng-attr-aria-label='{{
												!$this.p2pManager.isActive ?
													"Video Call" :
													!$this.p2pManager.p2p.outgoingStream.video ?
														"Enable Camera" :
														"Disable Camera"
											}}'
										>
											<img
												ng-show='
													!$this.p2pManager.isActive ||
													!$this.p2pManager.p2p.outgoingStream.video
												'
												src='/img/icons/video.on.png'
												alt='Video on'
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													$this.p2pManager.p2p.outgoingStream.video
												'
												src='/img/icons/video.off.png'
												alt='Video off'
											/>
										</md-button>
										<md-button
											translate
											class='voice-call-button'
											aria-label='Voice Call'
											ng-disabled='
												!$this.p2pManager.isEnabled ||
												!$this.isConnected ||
												!$this.session.state.isAlive
											'
											ng-click='$this.p2pManager.voiceCallButton()'
											ng-attr-aria-label='{{
												!$this.p2pManager.isActive ?
													"Voice Call" :
													!$this.p2pManager.p2p.outgoingStream.audio ?
														"Enable Mic" :
														"Disable Mic"
											}}'
										>
											<img
												ng-show='!$this.p2pManager.isActive'
												src='/img/icons/voice.on.png'
												alt='Voice on'
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													!$this.p2pManager.p2p.outgoingStream.audio
												'
												src='/img/icons/mic.on.png'
												alt='Mic on'
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													$this.p2pManager.p2p.outgoingStream.audio
												'
												src='/img/icons/mic.off.png'
												alt='Mic off'
											/>
										</md-button>
										<md-button
											translate
											class='send-file-button'
											ng-disabled='
												$this.p2pManager.p2p.outgoingFile.name ||
												!$this.p2pManager.isEnabled ||
												!$this.isConnected ||
												!$this.session.state.isAlive
											'
											aria-label='Send File'
										>
											<img src='/img/icons/file.png' alt='File' />
											<input
												type='file'
												cyph-filechange='$this.p2pManager.sendFileButton()'
											/>
										</md-button>
									</span>

									<md-button translate aria-label='Menu' ng-click='open()'>
										<img src='/img/icons/menu.png' alt='Menu' />
									</md-button>
								</span>
							</div>
						</md-toolbar>

						<md-sidenav md-component-id='sidenav' class='md-sidenav-right'>
							<md-toolbar>
								<h1 translate class='md-toolbar-tools'>Settings</h1>
							</md-toolbar>
							<md-content class='md-padding'>
								<div>
									<md-button
										translate
										aria-label='Show Cyphertext'
										ng-click='$this.cyphertext.show()'
									>
										Show Cyphertext
									</md-button>
								</div>
								<div>
									<md-button
										translate
										aria-label='Formatting Help'
										ng-click='$this.formattingHelpButton()'
									>
										Formatting Help
									</md-button>
								</div>
								<div>
									<md-button
										translate
										aria-label='Disconnect'
										ng-disabled='!$this.session.state.isAlive'
										ng-click='$this.disconnectButton()'
									>
										Disconnect
									</md-button>
								</div>
							</md-content>
						</md-sidenav>
					</div>
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
							<div ng-show='$this.isPassive' translate>
								Waiting for friend to join...
							</div>
							<div ng-hide='$this.isPassive'>
								<div translate>
									Just have your friend open this link, and we're good to go!
								</div>
								<br />

								<md-input-container class='connect-link-input desktop-only'>
									<input translate ng-model='$this.link' aria-label='Cyph link' />
								</md-input-container>

								<div class='connect-link-mobile mobile-only'>
									<a
										class='connect-link-link'
										ng-href='{{$this.link}}'
									>{{$this.link}}</a>
									<br />

									<md-button
										translate
										class='md-fab'
										aria-label='SMS'
									>
										<img src='/img/icons/sms.png' alt='SMS' />
										<a
											target='_self'
											ng-href='{{Cyph.Env.smsUriBase}}{{$this.linkEncoded}}'
										></a>
									</md-button>

									<span class='divider'>
										&nbsp;
									</span>

									<md-button
										translate
										class='md-fab'
										aria-label='Email'
									>
										<img src='/img/icons/email.png' alt='Email' />
										<a
											target='_self'
											ng-href='mailto:?body={{$this.linkEncoded}}'
										></a>
									</md-button>
								</div>
							</div>

							<br />
							<div>
								<span translate>
									Link expires in
								</span>
								<timer
									class='timer'
									interval='1000'
									countdown='$this.countdown'
									autostart='false'
								>
									{{minutes}}:{{sseconds}}
								</timer>
							</div>
						</div>
						<div flex></div>
					</div>
				`,

				pro: `
					<md-content
						class='nano'
						layout='column'
						layout-fill
						flex
					>
						<div class='nano-content'>
							<div ng-show='$this.proState === Cyph.im.UI.ProStates.login'>
								Login screen
							</div>
							<div ng-show='$this.proState === Cyph.im.UI.ProStates.register'>
								Registration screen
							</div>
							<div ng-show='$this.proState === Cyph.im.UI.ProStates.settings'>
								Settings screen
							</div>
						</div>
					</md-content>
				`,

				signupForm: `
					<form class='beta-signup-form' ng-submit='$this.submit()'>
						<md-content>
							<div ng-show='$this.state === 0'>
								<div class='login' flex>
									<h2 class='md-title' translate>
										Login or Register
									</h2>
									<md-input-container>
										<label>Email</label>
										<input ng-model='user.email'>
									</md-input-container>
									<md-input-container>
										<label>Password</label>
										<input ng-model='user.password' type='password'>
									</md-input-container>
									<md-input-container>
										<div layout='row' layout-sm='column' layout-margin>
											<md-button
												translate
												type='submit'
												ng-click=''
												aria-label='Login'
												class='md-raised'
											>
												Login
											</md-button>
											<md-button
												translate
												type='submit'
												ng-click='$this.state = 1'
												aria-label='Register'
												ng-class='md-raised'
											>
												Register
											</md-button>
										</div>
									</md-input-container>
								</div>
								<div layout-align='center center' flex></div>
							</div>

							<div ng-show='$this.state === 1'>
								<md-icon
									md-font-set='material-icons'
									ng-click='$this.state = 0'
									class='back'
								>keyboard_backspace</md-icon>
								<h1 class='md-title' translate>
									WHAT ARE YOU?
								</h1>
								<div layout='row'>
									<div flex>
										<h2>Individual</h2>
										<md-button
											type='submit'
											ng-click='$this.state = 2'
											aria-label='Individual'
											ng-hide='$this.state !== 1'
										>
											<md-icon md-font-set='material-icons'>person</md-icon>
										</md-button>
									</div>

									<div flex>
										<h2>Business</h2>
										<md-button
											type='submit'
											ng-click='$this.state = 3'
											aria-label='Business'
											ng-hide='$this.state !== 1'
										>
											<md-icon md-font-set='material-icons'>domain</md-icon>
										</md-button>
									</div>
								</div>
							</div>

							<div translate ng-show='$this.state === 2'>
								<md-icon
									md-font-set='material-icons'
									ng-click='$this.state = 1'
									class='back'
								>keyboard_backspace</md-icon>
								<h1 translate>Registration</h1>
								<p>
									Registration is currently closed, however an acount is not required
									to use Cyph. To join the waitlist for a Cyph account please enter your
									email in the form below.
								</p>
								<md-input-container>
									<label translate>email</label>
									<input type='email' ng-model='$this.data.Email' />
								</md-input-container>
								<md-button
									type='submit'
									ng-click='this.signup()'
									aria-label='Register'
								>
									Subscribe
								</md-button>
							</div>

							<div translate ng-show='$this.state === 3'>
								<md-icon
									md-font-set='material-icons'
									ng-click='$this.state = 1'
									class='back'
								>keyboard_backspace</md-icon>
								<h1 translate>Business Pricing</h1>
								<div layout='row'>
									<div layout-padding class='pricing'>
										<h3>The Basics</h3>

										<div class='features'>
											<p>
												The core functionality of Cyph. Registration-optional
												secure chat and images.
											</p>

											<div class='feature'>
												<h4>Instant Messaging</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>chat</md-icon>
											</div>
											<div class='feature'>
												<h4>Picture Messaging</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>photo_camera</md-icon>
											</div>

											<p>All Plans</p>
											<hr>
											<div class='feature'>
												<h4>Unlimited Sessions</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>all_inclusive</md-icon>
											</div>
											<div class='feature'>
												<h4>Powerful Encryption</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>security</md-icon>
											</div>
										</div>

										<div class='price'>$99/mo</div>
									</div>

									<div layout-padding class='pricing'>
										<h3>The Works</h3>

										<div class='features'>
											<p>
												The current full functionality of Cyph. Everything in
												The Basics, <em>plus</em> voice, video, and file transfers.
											</p>

											<div class='feature'>
												<h4>The Basics, plus:</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>reply</md-icon>
											</div>
											<div class='feature indent'>
												<h4>Video Calling</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>videocam</md-icon>
											</div>
											<div class='feature indent'>
												<h4>Voice Calling</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>phone</md-icon>
											</div>
											<div class='feature indent'>
												<h4>File Transfers</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>attach_file</md-icon>
											</div>

											<p>All Plans</p>
											<hr>
											<div class='feature'>
												<h4>Unlimited Sessions</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>all_inclusive</md-icon>
											</div>
											<div class='feature'>
												<h4>Powerful Encryption</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>security</md-icon>
											</div>
										</div>

										<div class='price'>$495/mo</div>
									</div>

									<div layout-padding class='pricing'>
										<h3>The Works + API</h3>

										<div class='features'>
											<p>
												Integrate Cyph encryption into your app, site, or service.
												Everything in The Works, <em>plus</em> access to our API.
											<p>

											<div class='feature'>
												<h4>The Works, plus:</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>reply_all</md-icon>
											</div>
											<div class='feature indent'>
												<h4>API Access</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>settings</md-icon>
											</div>

											<p>All Plans</p>
											<hr>
											<div class='feature'>
												<h4>Unlimited Sessions</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>all_inclusive</md-icon>
											</div>
											<div class='feature'>
												<h4>Powerful Encryption</h4>
												<md-icon
													md-font-set='material-icons'
													class='ng-isolate-scope md-default-theme material-icons'
												>security</md-icon>
											</div>
										</div>

										<div class='price'>$995/mo</div>
									</div>
								</div>

								<div layout='column'>
									<div layout-padding class='pricing custom'>
										<h3>Custom</h3>

										<div class='features'>
											<p>
												Are you interested in using a subset of Cyph's features?
												Have a need for a whitelabel, self-hosted, or enterprise solution?
											</p>
										</div>

										<div class='price'>Contact Us</div>
									</div>
								</div>
							</div>
						</md-content>
					</form>
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
										ng-href='{{Cyph.Env.newCyphUrl}}'
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
					<div class='footer desktop-only'>
						&copy; Cyph 2016
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

						<a rel='noreferrer' href='https://twitter.com/cyph'>@cyph</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

						<a href='mailto:hello@cyph.com'>hello@cyph.com</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

						<a
							target='_self'
							href='tel:+19312974462'
							title='+1(931) 297 4462'
						>+1(931) CYPH INC</a>
						&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

						<a
							target='_self'
							href='bitcoin:1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd'
						>1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd</a>
					</div>
				`
			};

			(() => {
				for (const k of Object.keys(Templates)) {
					Templates[k]	= Util.translateHtml(Templates[k]);
				}
			})();
		}
	}
}
