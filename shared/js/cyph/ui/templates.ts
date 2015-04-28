module Cyph {
	export module UI {
		export let Templates	= {
			amazonLink: `
				<md-dialog class='amazon-link'>
					<md-content>
						<h2 translate>
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
						<md-checkbox translate ng-model='vars.remember' aria-label='Remember my preference'>
							Remember my preference
						</md-checkbox>
					</md-content>
					<div class='md-actions'>
						<md-button translate aria-label='No' ng-click='close(false)'>No</md-button>
						<md-button translate aria-label='Sure, add the code' ng-click='close(true)'>Sure, add the code</md-button>
					</div>
				</md-dialog>
			`,

			formattingHelp: `
				<md-dialog class='formatting-help'>
					<md-content>
						<h2 translate>
							Formatting Help
						</h2>
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
					</md-content>
				</md-dialog>
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
						ng-class='{"hidden-submit-button": hide-button}'
					>
						Sign up for beta
					</md-button>
				</form>
			`
		};

		(() => {
			for (let k of Object.keys(Templates)) {
				Templates[k]	= Util.translateHtml(Templates[k]);
			}
		})();
	}
}
