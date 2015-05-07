module Cyph {
	export module UI {
		export module Directives {
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
												message.author === Cyph.Session.Authors.me ?
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
							video: $this.p2pManager.isActive,
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
								<img src='/img/logo.animated.gif' />
							</div>
							<div translate>Initiating key exchange...</div>
							<div flex></div>
						</div>

						<div
							ng-view
							class='loading'
							layout='column'
							layout-fill
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.aborted
							}'
						>
							<div flex></div>
							<div class='logo-animation'>
								<img src='/img/walken.png' />
							</div>
							<div>
								<div translate>This cyph has been aborted.</div>
								<br />
								<span translate>Please</span>
								<a
									translate
									target='_self'
									ng-href='{{Cyph.Env.newCyphUrl}}'
								>
									try again
								</a>.
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
								src='/video/background.mp4'
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
								aria-label='End Call'
								class='md-fab md-theme-grey close-button'
								ng-click='$this.p2pManager.closeButton()'
							>
								<strong>&times;</strong>
							</md-button>
						</div>

						<div
							ng-view
							class='message-list nano'
							flex
							ng-class='{
								active: $this.state === Cyph.UI.Chat.States.chat,
								"is-connected": $this.isConnected
							}'
						>
							<md-content class='nano-content'>
								<md-list layout='column'>
									<md-item
										class='message-item unread'
										ng-class='::"author-" + Cyph.Session.Authors[message.author]'
										ng-repeat='message in $this.messages'
										layout='horizontal'
									>
										<span class='message'>
											<strong
												translate
												class='message-author'
												ng-hide='::message.author === Cyph.Session.Authors.app'
												ng-bind='::(
													message.author === Cyph.Session.Authors.me ?
														"me" :
														"friend"
												) + ": "'
											></strong>
											<span
												class='message-text'
												cyph-markdown='::message.text'
												ng-class='::{
													"app-message":
														message.author === Cyph.Session.Authors.app
												}'
											></span>
										</span>
										<span flex class='message-timestamp'>
											<span
												class='mobile-only'
												ng-show='::message.author === Cyph.Session.Authors.me'
											>
												<span translate>me</span> &nbsp;&mdash;&nbsp;
											</span>

											{{::message.timestamp}}

											<span
												class='mobile-only'
												ng-show='::message.author === Cyph.Session.Authors.friend'
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

							<div
								class='setting-up-crypto loading'
								layout='column'
								layout-fill
								flex
							>
								<div flex></div>
								<div class='logo-animation'>
									<img src='/img/logo.animated.gif' />
								</div>
								<div translate>Authenticating connection...</div>
								<div flex></div>
							</div>
						</div>
					</div>
				`,

				chatMessageBox: `
					<div
						class='chat-message-box platform-container'
						ng-class='{mobile: $this.isMobile}'
						ng-show='
							$this.state === Cyph.UI.Chat.States.chat &&
							$this.session.state.isAlive &&
							!(
								$this.isMobile &&
								$this.p2pManager.isPlaying()
							)
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
							<img src='/img/icons/send.png' />
						</md-button>

						<md-button
							translate
							class='insert-photo-mobile mobile-only'
							ng-class='{"chat-message-box-hidden": $this.currentMessage !== ""}'
							aria-label='Insert Photo'
						>
							<img src='/img/icons/insertphoto.grey.png' />
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
							<img src='/img/icons/insertphoto.png' />
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
					<div class='chat-sidebar'>
						<a class='logo' ng-href='{{Cyph.Env.homeUrl}}'>
							<img src='/img/betalogo.png' />
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
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.video
										'
										src='/img/icons/video.off.png'
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
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											!$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.on.png'
									/>
									<img
										ng-show='
											$this.p2pManager.isActive &&
											$this.p2pManager.p2p.outgoingStream.audio
										'
										src='/img/icons/mic.off.png'
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
									<img src='/img/icons/file.png' />
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
								<a class='logo' ng-href='{{Cyph.Env.homeUrl}}'>
									<img src='/img/betalogo.mobile.png' />
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
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													$this.p2pManager.p2p.outgoingStream.video
												'
												src='/img/icons/video.off.png'
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
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													!$this.p2pManager.p2p.outgoingStream.audio
												'
												src='/img/icons/mic.on.png'
											/>
											<img
												ng-show='
													$this.p2pManager.isActive &&
													$this.p2pManager.p2p.outgoingStream.audio
												'
												src='/img/icons/mic.off.png'
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
											<img src='/img/icons/file.png' />
											<input
												type='file'
												cyph-filechange='$this.p2pManager.sendFileButton()'
											/>
										</md-button>
									</span>

									<md-button translate aria-label='Menu' ng-click='open()'>
										<img src='/img/icons/menu.png' />
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

				signupForm: `
					<form class='beta-signup-form' ng-submit='$this.submit()'>
						<div ng-show='$this.state === 0'>
							<ng-transclude></ng-transclude>
							<md-input-container>
								<label translate>email</label>
								<input type='email' ng-model='$this.data.Email' />
							</md-input-container>
						</div>

						<div ng-show='$this.state === 1'>
							<p translate>
								Thanks so much for signing up!
							</p>
							<p translate>
								Feel free to add your name as well. :)
							</p>
							<md-input-container>
								<label translate>name (optional)</label>
								<input ng-model='$this.data.Name' />
							</md-input-container>
						</div>

						<div ng-show='$this.state === 2'>
							You rock.
						</div>

						<md-button
							translate
							type='submit'
							aria-label='Sign up for beta'
							ng-hide='$this.state > 1'
							ng-class='{"hidden-submit-button": hideButton}'
						>
							Sign up for beta
						</md-button>
					</form>
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
