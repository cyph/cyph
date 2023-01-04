import {getMeta} from '../base.js';
const {__dirname} = getMeta(import.meta);

import fs from 'fs/promises';
import memoize from 'lodash-es/memoize.js';
import {markdownEscapes} from 'markdown-escapes';
import MarkdownIt from 'markdown-it';
import mustache from 'mustache';
import {dompurifyHtmlSanitizer} from '../dompurify-html-sanitizer.js';

const markdownIt = new MarkdownIt();

const markdownEscapeWhitelist = new Set([
	'accountsURL',
	'accountsURLShort',
	'email',
	'packageName'
]);

const markdownEscape = markdown =>
	typeof markdown === 'string' ?
		markdownEscapes.reduce((s, c) => {
			while (s.indexOf(c) > -1) {
				s = s.replace(c, '\n');
			}
			return s.replace(/\n/g, `\\${c}`);
		}, markdown.replace(/\s+/g, ' ').trim()) :
		markdown;

const mustacheUnescape = memoize(template =>
	template.replace(/\{?\{\{([^#\^\/].*?)\}\}\}?/g, '{{{$1}}}')
);

const getTemplate = memoize(async templateName =>
	(await fs.readFile(`${__dirname}/templates/${templateName}.md`)).toString()
);

export const renderMarkdown = markdown =>
	dompurifyHtmlSanitizer
		.sanitize(markdownIt.render(markdown).replace(/\s+/g, ' '))
		.trim();

export const render = (template, data, markdownOnly) => {
	const markdown = mustache
		.render(
			mustacheUnescape(template),
			Object.entries(data || {}).reduce(
				(o, [k, v]) => ({
					...o,
					[k]: markdownEscapeWhitelist.has(k) ? v : markdownEscape(v)
				}),
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

export const renderTemplate = async (templateName, data, markdownOnly) =>
	render(await getTemplate(templateName), data, markdownOnly);
