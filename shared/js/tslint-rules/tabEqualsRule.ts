/* tslint:disable */

import {IRuleMetadata, RuleFailure} from 'tslint/lib/language/rule/rule';
import {RuleWalker} from 'tslint/lib/language/walker';
import {AbstractRule} from 'tslint/lib/rules';
import * as ts from 'tslint/node_modules/typescript/lib/typescript';


export class Rule extends AbstractRule {
	public static metadata: IRuleMetadata	= {
		ruleName: 'tab-equals',
		description:
			'Requires = in variable assignment to be preceded by tab(s)' +
			'and followed by either a newline or exactly one space.'
		,
		descriptionDetails: 'For alignment.',
		optionsDescription: 'Not configurable.',
		options: null,
		optionExamples: ['true'],
		type: 'style',
		typescriptOnly: false
	};

	public static FAILURE_STRING: string	=
		'assignment operator must be preceded by tab(s) and followed by newline or space'
	;

	public static isCompliant (node: ts.Node) : boolean {
		if (
			node.kind === ts.SyntaxKind.CallExpression ||
			node.kind === ts.SyntaxKind.Parameter ||
			(
				node.parent && (
					node.parent.kind === ts.SyntaxKind.Constructor ||
					node.parent.kind === ts.SyntaxKind.FunctionDeclaration ||
					node.parent.kind === ts.SyntaxKind.MethodDeclaration ||
					node.parent.kind === ts.SyntaxKind.Parameter ||
					node.parent.kind === ts.SyntaxKind.VariableDeclarationList ||
					(
						node.parent.parent && (
							node.parent.parent.kind === ts.SyntaxKind.Parameter
						)
					)
				)
			)
		) {
			return true;
		}

		const equalsSplit	= node.getText().
			replace(/=>/g, '').
			replace(/>=/g, '').
			replace(/<=/g, '').
			replace(/!==/g, '').
			replace(/!=/g, '').
			replace(/===/g, '').
			replace(/==/g, '').
			replace(/\+=/g, '').
			replace(/-=/g, '').
			replace(/\*=/g, '').
			replace(/\/=/g, '').
			split(/['"`]/g)[0].
			split('=')
		;

		if (equalsSplit.length < 2) {
			return true;
		}

		const equalsPrefix	= (equalsSplit[0].match(/\s+$/) || [''])[0];
		const equalsSuffix	= (equalsSplit[1].match(/^\s+/) || [''])[0];

		return !!(
			(equalsPrefix.match(/\t/) && !equalsPrefix.match(/ /)) &&
			(
				(equalsSuffix[0] === '\n' && !equalsSuffix.match(/ /)) ||
				(equalsSuffix[0] === ' ' && equalsSuffix.length === 1)
			)
		);
	}

	public apply (sourceFile: ts.SourceFile) : RuleFailure[] {
		return this.applyWithWalker(
			new TabEqualsWalker(sourceFile, this.getOptions())
		);
	}
}

class TabEqualsWalker extends RuleWalker {
	public visitPropertyAccessExpression (node: ts.PropertyAccessExpression) : void {
		try {
			if (node.parent === undefined) {
				return;
			}

			if (Rule.isCompliant(node.parent)) {
				return;
			}

			this.addFailure(
				this.createFailure(
					node.parent.getStart(),
					node.parent.getWidth(),
					Rule.FAILURE_STRING
				)
			);
		}
		finally {
			super.visitPropertyAccessExpression(node);
		}
	}

	public visitPropertyDeclaration (node: ts.PropertyDeclaration) : void {
		try {
			if (Rule.isCompliant(node)) {
				return;
			}

			this.addFailure(
				this.createFailure(
					node.getStart(),
					node.getWidth(),
					Rule.FAILURE_STRING
				)
			);
		}
		finally {
			super.visitPropertyDeclaration(node);
		}
	}

	public visitVariableDeclaration (node: ts.VariableDeclaration) : void {
		try {
			if (Rule.isCompliant(node)) {
				return;
			}

			this.addFailure(
				this.createFailure(
					node.getStart(),
					node.getWidth(),
					Rule.FAILURE_STRING
				)
			);
		}
		finally {
			super.visitVariableDeclaration(node);
		}
	}

	public visitVariableStatement (node: ts.VariableStatement) : void {
		try {
			if (Rule.isCompliant(node)) {
				return;
			}

			this.addFailure(
				this.createFailure(
					node.getStart(),
					node.getWidth(),
					Rule.FAILURE_STRING
				)
			);
		}
		finally {
			super.visitVariableStatement(node);
		}
	}
}
