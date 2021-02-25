const fs = require('fs');
const memoize = require('lodash/memoize');
const markdownEscapes = require('markdown-escapes');
const MarkdownIt = require('markdown-it');
const mustache = require('mustache');
const {dompurifyHtmlSanitizer} = require('./dompurify-html-sanitizer');

const markdownIt = new MarkdownIt();

const markdownEscape = markdown =>
	typeof markdown === 'string' ?
		markdownEscapes.commonmark.reduce((s, c) => {
			while (s.indexOf(c) > -1) {
				s = s.replace(c, '\n');
			}
			return s.replace(/\n/g, `\\${c}`);
		}, markdown.replace(/\s+/g, ' ').trim()) :
		markdown;

const mustacheUnescape = memoize(template =>
	template.replace(/\{?\{\{([^#\^\/].*?)\}\}\}?/g, '{{{$1}}}')
);

const getTemplate = memoize(
	async templateName =>
		new Promise((resolve, reject) => {
			fs.readFile(
				`${__dirname}/templates/${templateName}.md`,
				(err, data) => {
					if (err) {
						reject(err);
					}
					else {
						resolve(data.toString());
					}
				}
			);
		})
);

const renderMarkdown = markdown =>
	dompurifyHtmlSanitizer
		.sanitize(markdownIt.render(markdown).replace(/\s+/g, ' '))
		.trim();

const render = (template, data, markdownOnly) => {
	const markdown = mustache
		.render(
			mustacheUnescape(template),
			Object.entries(data || {}).reduce(
				(o, [k, v]) => ({...o, [k]: markdownEscape(v)}),
				{}
			)
		)
		.trim()
		.replace(/\n\n+/g, '\n\n');

	return {
		html: markdownOnly ? '' : renderMarkdown(markdown),
		markdown
	};
};

const renderTemplate = async (templateName, data, markdownOnly) =>
	render(await getTemplate(templateName), data, markdownOnly);

module.exports = {render, renderMarkdown, renderTemplate};
