import * as path from "path";
import { TextlintMessage, TextlintResult } from "@textlint/kernel";
import { createLinter, loadTextlintrc } from "textlint";
import { configPath } from "textlint-rule-preset-icsmedia";
import {
	Diagnostic,
	DiagnosticSeverity,
	Position,
	Range,
} from 'vscode-languageserver/node';
import { URI } from "vscode-uri";
import HTMLPlugin from "textlint-plugin-html";
import LatexPlugin from "textlint-plugin-latex2e";
import ReviewPlugin from "textlint-plugin-review";

import { TextDocument } from 'vscode-languageserver-textdocument';
import { APP_NAME, UserSettings } from '@custom-japanese-proofreading/common';

// バリデーション（textlint）を実施
export async function validateTextDocument(
	textDocument: TextDocument,
	userSettings: UserSettings,
): Promise<Diagnostic[]> {
	// TODO: Promise<Diagnostic[]> として診断結果を返す書き方もできるみたい
	// VSCode側の設定を取得
	// const settings = userSettings.getDocumentSettings(connection, textDocument.uri);

	const document = textDocument.getText();

	// ICS MEDIAのルールのtextlintの設定ファイルを読み込み
	console.log(configPath);
	const defaultDescriptor = await loadTextlintrc({
		configFilePath: configPath,
	});

	// デフォルトのプラグイン設定を取得。テキスト・マークダウン用のプラグインなどが入っている想定	
	const defalutPluginSettings = defaultDescriptor.toKernelOptions().plugins;

	// 追加のプラグイン設定
	const extendPlugins = [
		{
			pluginId: "@textlint/textlint-plugin-html",
			plugin: HTMLPlugin,
		},
		{
			pluginId: "@textlint/textlint-plugin-latex2e",
			plugin: LatexPlugin,
		},
		{
			pluginId: "@textlint/textlint-plugin-review",
			plugin: ReviewPlugin,
		},
	];

	let descriptor;
	const diagnostics: Diagnostic[] = [];

	if (defalutPluginSettings) {
		descriptor = defaultDescriptor.shallowMerge({
			plugins: [...defalutPluginSettings, ...extendPlugins],
		});
	} else {
		descriptor = defaultDescriptor.shallowMerge({
			plugins: [...extendPlugins],
		});
	}

	// ファイルの拡張子
	const ext: string = path.extname(textDocument.uri);
	// サポートされている拡張子
	const targetExtension = descriptor.availableExtensions.find((i) => i === ext) ?? null;

	// 対応していない拡張子の場合、バリデーションを実行しない
	if (targetExtension === null) {
		return [];
	}

	const linter = createLinter({
		descriptor,
	});
	const results: TextlintResult = await linter.lintText(
		document,
		URI.parse(textDocument.uri).fsPath,
	);

	// エラーが存在する場合
	if (results.messages.length) {
		// エラーメッセージ一覧を取得
		const messages: TextlintMessage[] = results.messages;
		const l: number = messages.length;
		for (let i = 0; i < l; i++) {
			const message: TextlintMessage = messages[i];
			const text = `${message.message}（${message.ruleId}）`;

			// 有効とされているエラーか？
			if (!userSettings.isTarget(textDocument, message.ruleId, message.message)) {
				continue;
			}

			// エラー範囲の開始位置のズレ
			let startCharacterDiff = 0;

			// エラーのルールが「不自然な濁点」か？
			const isRuleNoNfd = message.ruleId === "japanese/no-nfd";
			if (isRuleNoNfd) {
				// ルール「不自然な濁点」は、修正テキストを1文字ずらして生成していると思われるため、エラー開始位置も1文字ずらしたい
				startCharacterDiff = -1;
			}

			// エラーの文字数を取得します。
			// 文字数が存在しない場合の値は1になります。
			const posRange = message.fix?.range
				? message.fix.range[1] - message.fix.range[0]
				: 1;
			// エラーの開始位置を取得します。
			const startPos = Position.create(
				Math.max(0, message.loc.start.line - 1),
				Math.max(0, message.loc.start.column - 1 + startCharacterDiff),
			);
			// エラーの終了位置を取得します。
			const endPos = Position.create(
				Math.max(0, message.loc.end.line - 1),
				Math.max(0, message.loc.start.column - 1 + startCharacterDiff + posRange),
			);
			const canAutofixMessage = message.fix ? "🪄 " : "";
			// 診断結果を作成
			const diagnostic: Diagnostic = {
				severity: toDiagnosticSeverity(message.severity),
				range: Range.create(startPos, endPos),
				message: canAutofixMessage + text,
				source: APP_NAME,
				code: message.ruleId,
				data: message.fix?.text,
			};
			diagnostics.push(diagnostic);
		}
	}
	return diagnostics;
}

const toDiagnosticSeverity = (severity: number) => {
	switch (severity) {
		case 0:
			return DiagnosticSeverity.Information;
		case 1:
			return DiagnosticSeverity.Warning;
		case 2:
			return DiagnosticSeverity.Error;
	}
	return DiagnosticSeverity.Information;
};
