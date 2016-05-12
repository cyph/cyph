import {Util} from 'cyph/util';


/**
 * Reusable HTML view templates.
 */
export const Templates	= {
	amazonLink: `
		<md-dialog class='amazon-link'>
			<md-content>
				<h2 class='md-title' translate>
					Amazon Link
				</h2>
				<p translate>
					You have the option to add Cyph's Amazon affiliate code to this link.
				</p>
				<p translate>
					If you make a purchase, this code will give us a small commission to help keep
					the service running. However, it will also anonymously include your purchase in
					aggregate data reported to us by Amazon.
				</p>
				<p translate>
					Add the code?
				</p>
				<md-checkbox translate ng-model='locals.remember' aria-label='Remember my preference'>
					Remember my preference
				</md-checkbox>
			</md-content>
			<div class='md-actions'>
				<md-button translate aria-label='No' ng-click='close(false)'>No</md-button>
				<md-button translate aria-label='Sure, add the code' ng-click='close(true)'>Sure, add the code</md-button>
			</div>
		</md-dialog>
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
					</div>
					<md-tab label='Contact Cyph'>
					<span translate> Please check out the </span>
					<a href='{{Cyph.Env.homeUrl}}/faq'>FAQs</a>
					<span translate> first!</span>
					<br />
					<br />
					<br />
						<cyph-contact to='"help"'></cyph-contact>
					</md-tab>
				</md-tabs>
			</md-content>
		</md-dialog>
	`,

	login: `
		<md-dialog class='login'>
			<md-content layout='row' layout-align='center center'>
				<md-card layout='column' flex='75' class='md-padding'>
					<md-card-title>
						<md-card-title-text>
							<span class='md-headline' translate>
								Register
							</span>
							<span class='md-subhead' translate>
								Registration is currently closed, but you can sign up for the
								waitlist to receive an account.
							</span>
						</md-card-title-text>
					</md-card-title>
					<md-card-content>
						<p translate>
							Note that an account isn't necessary just to use Cyph (see the
							"start new cyph" button on our home page), but rather to receive
							access to more advanced functionality in the pipeline, such as group
							messaging and persistent encrypted chat history.
						</p>
						<div cyph-signup-form='locals.signupForm'></div>
					</md-card-content>
				</md-card>
				<md-card layout='column' flex='25' class='md-padding'>
					<md-card-title>
						<md-card-title-text>
							<span class='md-headline' translate>
								Log In
							</span>
							<span class='md-subhead' translate>
								Sign in to your beta account.
							</span>
						</md-card-title-text>
					</md-card-title>
					<md-card-content>
						<div layout='row' layout-align='center center'>
							<md-button aria-label='Log In' translate>
								<a ng-href='{{locals.Cyph.Env.newCyphBaseUrl}}#pro/login' translate>
									Log In
								</a>
							</md-button>
						</div>
					</md-card-content>
				</md-card>
			</md-content>
		</md-dialog>
	`
};

(() => {
	for (const k of Object.keys(Templates)) {
		Templates[k]	= Util.translateHtml(Templates[k]);
	}
})();
