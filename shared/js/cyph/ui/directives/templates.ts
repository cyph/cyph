import {Util} from 'cyph/util';


/**
 * Reusable HTML view templates for component directives.
 */
export const Templates	= {
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
					ng-show='$this.betaState === Cyph.im.UI.BetaStates.login'
					ng-class='{checking: checking}'
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
									<md-subheader ng-style='{visibility: error ? "visible" : "hidden"}'>
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
				<div ng-show='$this.betaState === Cyph.im.UI.BetaStates.register'>
					Registration screen
				</div>
				<div ng-show='$this.betaState === Cyph.im.UI.BetaStates.settings'>
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
						ng-repeat='message in $this.cyphertext.messages'
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
				video: $this.p2pManager.p2p.isActive,
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
				class='chat-begin-message loading'
				layout='column'
				layout-fill
				flex
				ng-class='{
					active: $this.state === Cyph.UI.Chat.States.chatBeginMessage
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
				ng-view
				class='video-call'
				flex
				ng-class='{
					active: $this.state === Cyph.UI.Chat.States.chat,
					playing: $this.p2pManager.p2p.isActive
				}'
			>
				<a class='logo' rel='noreferrer' ng-href='{{Cyph.Env.homeUrl}}'>
					<img src='/img/betalogo.mobile.png' alt='Beta logo' />
				</a>
				<div
					class='friend stream'
					ng-show='$this.p2pManager.p2p.incomingStream.video'
					autoplay
				></div>
				<img
					class='friend'
					ng-if='!(
						$this.p2pManager.p2p.incomingStream.video ||
						$this.p2pManager.p2p.loading
					)'
					src='/img/voicecall.jpg'
				/>
				<video
					class='me'
					ng-show='$this.p2pManager.p2p.outgoingStream.video'
					autoplay
					muted
				></video>

				<md-progress-circular
					ng-show='$this.p2pManager.p2p.loading'
					md-mode='indeterminate'
				></md-progress-circular>

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
							ng-show='!$this.p2pManager.p2p.outgoingStream.video'
							src='/img/icons/video.on.png'
							alt='Video on'
						/>
						<img
							ng-show='$this.p2pManager.p2p.outgoingStream.video'
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
							ng-show='!$this.p2pManager.p2p.outgoingStream.audio'
							src='/img/icons/mic.on.png'
							alt='Mic on'
						/>
						<img
							ng-show='$this.p2pManager.p2p.outgoingStream.audio'
							src='/img/icons/mic.off.png'
							alt='Mic off'
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
							class='progress'
							ng-repeat='transfer in $this.fileManager.files.transfers'
							layout='row'
						>
							<div layout='column' layout-align=' start' flex>
								<div layout='row'>
									<span ng-show='transfer.isOutgoing' translate>Sending</span>
									<span ng-hide='transfer.isOutgoing' translate>Receiving</span>
									&nbsp;
									<span>
										{{transfer.name}}
										({{Cyph.Util.readableByteLength(transfer.size)}}):
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
							ng-class='::
								"author-" +
								(Cyph.Session.Users[message.author] || Cyph.Session.Users.other)
							'
							ng-repeat='message in $this.messages'
							layout='row'
						>
							<span class='message'>
								<strong
									translate
									class='message-author'
									ng-hide='::message.author === Cyph.Session.Users.app'
									ng-bind='::message.author + ": "'
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
									<span>{{::message.author}}</span> &nbsp;&mdash;&nbsp;
								</span>

								{{::message.timeString}}

								<span
									class='mobile-only'
									ng-show='::
										message.author !== Cyph.Session.Users.me &&
										message.author !== Cyph.Session.Users.app
									'
								>
									&nbsp;&mdash;&nbsp; <span>{{::message.author}}</span>
								</span>
							</span>
						</md-item>

						<md-item
							class='friend-is-typing'
							ng-class='{"show": $this.isFriendTyping}'
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
							ng-show='$this.isDisconnected && !hideDisconnectMessage'
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
				<md-icon class='grey'>send</md-icon>
			</md-button>

			<md-fab-speed-dial
				md-direction='up'
				class='md-fling md-fab-bottom-right'
				md-open='isOpen'
				ng-mouseenter='isOpen = true'
				ng-mouseleave='isOpen = false'
			>
				<md-fab-trigger>
					<md-button
						aria-label='Menu'
						class='md-fab'
					>
						<img src='/img/logo.white.icon.png' />
					</md-button>
				</md-fab-trigger>
				<md-fab-actions>
					<md-button
						aria-label='Send File'
						class='md-fab md-raised md-mini send-file-button'
					>
						<md-tooltip md-direction='left'>
							Send File
						</md-tooltip>
						<md-icon class='grey'>attach_file</md-icon>
						<input
							type='file'
							cyph-filechange='$this.fileManager.send(this)'
						/>
					</md-button>
					<md-button
						aria-label='Send Image'
						class='md-fab md-raised md-mini'
					>
						<md-tooltip md-direction='left'>
							Send Image
						</md-tooltip>
						<md-icon class='grey'>insert_photo</md-icon>
						<input
							accept='image/*'
							type='file'
							cyph-filechange='$this.fileManager.send(this, true)'
						/>
					</md-button>
					<md-button
						aria-label='Voice Call'
						class='md-fab md-raised md-mini'
						ng-click='$this.p2pManager.voiceCallButton()'
						ng-disabled='!$this.p2pManager.isEnabled'
						ng-hide='$this.p2pManager.p2p.isActive'
					>
						<md-tooltip md-direction='left'>
							Voice Call
						</md-tooltip>
						<md-icon class='grey'>phone</md-icon>
					</md-button>
					<md-button
						aria-label='Video Call'
						class='md-fab md-raised md-mini'
						ng-click='$this.p2pManager.videoCallButton()'
						ng-disabled='!$this.p2pManager.isEnabled'
						ng-hide='$this.p2pManager.p2p.isActive'
					>
						<md-tooltip md-direction='left'>
							Video Call
						</md-tooltip>
						<md-icon class='grey'>videocam</md-icon>
					</md-button>
				</md-fab-actions>
			</md-fab-speed-dial>

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

	chatToolbar: `
		<div
			class='platform-container'
			ng-class='{mobile: $this.isMobile}'
		>
			<div
				class='buttons'
				layout='row'
				layout-align='end end'
				flex='95'
				ng-show='$this.isConnected && !$this.isDisconnected'
			>
				<img
					src='/img/icons/help.png'
					ng-click='$this.helpButton()'
				/>
				<a href='{{Cyph.Env.homeUrl}}'>
					<img src='/img/logo.white.icon.small.png' />
				</a>
				<img
					src='/img/icons/close.png'
					ng-click='$this.disconnectButton()'
				/>
			</div>
		</div>
	`,

	checkout: `
		<form>
			<div ng-hide='complete'>
				<div class='checkout-ui'>
					<div class='braintree'></div>
					<div layout='row' layout-sm='column' layout-xs='column'>
						<md-input-container class='md-block' flex>
							<input ng-model='name' aria-label='Name' />
							<label>Name</label>
						</md-input-container>
						<md-input-container class='md-block' flex>
							<input ng-model='email' type='email' aria-label='Email' />
							<label>Email</label>
						</md-input-container>
					</div>
				</div>
				<md-button type='submit'>
					Confirm \${{amount}} payment
				</md-button>
			</div>
			<div translate class='confirmation' ng-show='complete'>
				<ng-transclude></ng-transclude>
			</div>
		</form>
	`,

	contact: `
		<div>
			<div ng-hide='$this.sent'>
				<div layout-gt-xs='row'>
					<md-input-container class='md-block' flex>
						<label>Cyph team to contact</label>
						<md-select ng-model='$this.to'>
							<md-option
								ng-repeat='address in Cyph.Config.cyphEmailAddresses'
								value='{{address}}'
							>
								{{address}}
							</md-option>
						</md-select>
					</md-input-container>
				</div>
				<div layout='row'>
					<md-input-container class='md-block' flex>
						<input ng-model='$this.fromName' aria-label='Name' />
						<label>Name</label>
					</md-input-container>
					<md-input-container class='md-block' flex>
						<input ng-model='$this.fromEmail' type='email' aria-label='Email' />
						<label>Email</label>
					</md-input-container>
				</div>
				<md-input-container class='md-block'>
					<input ng-model='$this.subject' aria-label='Subject' />
					<label>Subject</label>
				</md-input-container>
				<md-input-container class='md-block'>
					<textarea ng-model='$this.message' aria-label='Message' md-select-on-focus></textarea>
					<label>Message</label>
				</md-input-container>
				<md-button>
					Send
				</md-button>
			</div>
			<div ng-show='$this.sent'>
				Your email has been sent! Someone on the team will get back to you shortly.
			</div>
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
						Send the link below to someone else. When they open it, you'll be securely connected!
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
							ng-href='{{Cyph.Env.smsUriBase}}{{$this.linkEncoded}}'
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
							ng-href='mailto:?body={{$this.linkEncoded}}'
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

	signupForm: `
			<div class='beta-signup-form'>
				<form ng-submit='$this.submit()' ng-show='$this.state === 0'>
					<div layout='row' layout-align='center center' flex>
						<ng-transclude></ng-transclude>
					</div>
					<div layout='row' layout-align='center stretch' flex>
						<div class='desktop-only' layout='column' flex='50'>
							<div layout='row' layout-align='center center'>
								<md-input-container class='md-block' flex='80'>
									<input type='email' ng-model='$this.data.email' aria-label='Email' />
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
							<div ng-if='invite' layout='row' layout-align='center center'>
								<md-input-container class='md-block' flex='80'>
									<input type='text' id='invitecode' ng-model='$this.data.inviteCode' aria-label='Invite Code' />
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

				<form ng-submit='$this.submit()' ng-show='$this.state === 1'>
					<div layout='row' layout-align='center center' flex>
						<div layout='column' flex>
							<div layout='row' layout-align='center center'>
								<md-input-container class='md-block' flex='80'>
									<input type='email' ng-model='$this.data.email' aria-label='Email' required />
									<label>Email</label>
								</md-input-container>
							</div>
							<div layout='row' ng-if='invite' layout-align='center center'>
								<md-input-container class='md-block' flex='80'>
									<input type='text' ng-model='$this.data.inviteCode' aria-label='Invite Code' required />
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

				<form ng-submit='$this.submit()' ng-show='$this.state === 2'>
					<div layout='row' layout-align='center center' flex>
						<div layout='column' flex>
							<div layout='row' layout-align='center center'>
								<md-input-container class='md-block' flex='80'>
									<input ng-model='$this.data.name' aria-label='Name' />
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

				<form ng-submit='$this.submit()' ng-show='$this.state === 3'>
					<div layout='row' layout-align='center center' flex>
						<div layout='column' flex>
							<div layout='row' layout-align='center center'>
								<p flex='80' translate>
									Thanks for subscribing, {{$this.data.name}}! We'll email you
									when your invite is ready.
								</p>
							</div>
						</div>
					</div>
				</form>
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
		<div layout='row' flex class='footer desktop-only'>
			<div flex></div>

			<div layout='row' ng-hide='ui.coBranded'>
				<p flex='nogrow' layout-padding>
					© Cyph 2016 (Patents Pending)
				</p>

				<p flex='nogrow' layout-padding>
					<a flex ng-href='{{Cyph.Env.homeUrl}}contact'>Contact</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{Cyph.Env.homeUrl}}donate'>
						Donate
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<strong ng-hide='ui.chat.session.state.wasInitiatedByAPI'>
						- Individual Use Only -
					</strong>
					<strong ng-show='ui.chat.session.state.wasInitiatedByAPI'>
						- Cyph API -
					</strong>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{Cyph.Env.homeUrl}}pricing'>
						Business Pricing
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{Cyph.Env.homeUrl}}privacypolicy'>
						Privacy Policy
					</a>
				</p>

				<p flex='nogrow' layout-padding>
					<a ng-href='{{Cyph.Env.homeUrl}}termsofservice'>
						Terms of Service
					</a>
				</p>
			</div>

			<div layout='row' ng-show='ui.coBranded'>
				<p flex='nogrow' layout-padding>
					<a ng-href='{{Cyph.Env.homeUrl}}' class='small-font'>
						Powered by Cyph
					</a>
				</p>
			</div>

			<div flex></div>
		</div>
	`
};

(() => {
	for (let k of Object.keys(Templates)) {
		Templates[k]	= Util.translateHtml(Templates[k]);
	}
})();
