
import { Connection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { APP_ID } from './common';

/**
 * ユーザ設定のインターフェース
 */
interface SettingsInterface {
	/** 問題を表示する最大数 */
	readonly maxNumberOfProblems: number;
	/**
	 * 拡張機能側で提供する、
	 * 使用頻度が高いと思われるルールの設定
	 */
	readonly "textlint-preset": {
		/** 許容できる最大の読点の数 */
		readonly "preset-japanese/max-ten": boolean;
		/** 逆接の「が」の複数回出現を許容しない */
		readonly "preset-japanese/no-doubled-conjunctive-particle-ga": boolean;
		/** 接続詞の連続を許容しない */
		readonly "preset-japanese/no-doubled-conjunction": boolean;
		/** 二重否定を許容しない */
		readonly "preset-japanese/no-double-negative-ja": boolean;
		/** 助詞の連続を許容しない */
		readonly "preset-japanese/no-doubled-joshi": boolean;
		/** ら抜き言葉を許容しない */
		readonly "preset-japanese/no-dropping-the-ra": boolean;
		/** ですます調とである調を混ぜない */
		readonly "preset-japanese/no-mix-dearu-desumasu": boolean;
		/** 不自然な濁点を検出 */
		readonly "preset-japanese/no-nfd": boolean;
		/** 制御文字を検出 */
		readonly "preset-japanese/no-invalid-control-character": boolean;
		/** ゼロ幅スペースを検出 */
		readonly "preset-japanese/no-zero-width-spaces": boolean;
		/** 康煕部首を検出 */
		readonly "preset-japanese/no-kangxi-radicals": boolean;
		/** 【テキスト校正くん】誤字の検出 */
		readonly "prh/goji": boolean;
		/** 【テキスト校正くん】重言の検出 */
		readonly "prh/jugen": boolean;
		/** 【テキスト校正くん】開く漢字の検出 */
		readonly "prh/hiraku-kanji": boolean;
		/** 【テキスト校正くん】冗長な表現の検出 */
		readonly "prh/jocho": boolean;
		/** 【テキスト校正くん】固有名詞 */
		readonly "prh/koyu-meishi": boolean;
		/** 【テキスト校正くん】技術用語 */
		readonly "prh/technical-term": boolean;
		/** 句点 string ならそれに合わせ、nullならチェックしない */
		readonly "kuten": string | null;
		/** 読点 string ならそれに合わせ、nullならチェックしない */
		readonly "tohten": string | null;
		// preset-jtf-style
		readonly "preset-jtf-style/2.1.8.算用数字": boolean;
		readonly "preset-jtf-style/2.1.9.アルファベット": boolean;
		readonly "preset-jtf-style/2.2.2.算用数字と漢数字の使い分け": boolean;
		readonly "preset-jtf-style/2.2.3.一部の助数詞の表記": boolean;
		readonly "preset-jtf-style/3.1.1.全角文字と半角文字の間": boolean;
		readonly "preset-jtf-style/3.1.2.全角文字どうし": boolean;
		readonly "preset-jtf-style/3.3.かっこ類と隣接する文字の間のスペースの有無": boolean;
		readonly "preset-jtf-style/4.2.2.疑問符(？)": boolean;
		readonly "preset-jtf-style/4.2.6.ハイフン(-)": boolean;
		readonly "preset-jtf-style/4.2.9.ダッシュ(-)": boolean;
		readonly "preset-jtf-style/4.3.1.丸かっこ（）": boolean;
		readonly "preset-jtf-style/4.3.2.大かっこ［］": boolean;
	};
}

/**
 * 設定のデフォルト値
 */
const defaultSettings: SettingsInterface = {
	maxNumberOfProblems: 1000,
	"textlint-preset": {
		// preset-japanese
		"preset-japanese/max-ten": true,
		"preset-japanese/no-doubled-conjunctive-particle-ga": true,
		"preset-japanese/no-doubled-conjunction": true,
		"preset-japanese/no-double-negative-ja": true,
		"preset-japanese/no-doubled-joshi": true,
		"preset-japanese/no-dropping-the-ra": true,
		"preset-japanese/no-mix-dearu-desumasu": true,
		"preset-japanese/no-nfd": true,
		"preset-japanese/no-invalid-control-character": true,
		"preset-japanese/no-zero-width-spaces": true,
		"preset-japanese/no-kangxi-radicals": true,
		// prh
		"prh/goji": true,
		"prh/jugen": true,
		"prh/hiraku-kanji": true,
		"prh/jocho": true,
		"prh/koyu-meishi": true,
		"prh/technical-term": true,
		// 句読点
		"kuten": "。",
		"tohten": "、",
		// preset-jtf-style
		"preset-jtf-style/2.1.8.算用数字": true,
		"preset-jtf-style/2.1.9.アルファベット": true,
		"preset-jtf-style/2.2.2.算用数字と漢数字の使い分け": true,
		"preset-jtf-style/2.2.3.一部の助数詞の表記": true,
		"preset-jtf-style/3.1.1.全角文字と半角文字の間": true,
		"preset-jtf-style/3.1.2.全角文字どうし": true,
		"preset-jtf-style/3.3.かっこ類と隣接する文字の間のスペースの有無": true,
		"preset-jtf-style/4.2.2.疑問符(？)": true,
		"preset-jtf-style/4.2.6.ハイフン(-)": true,
		"preset-jtf-style/4.2.9.ダッシュ(-)": true,
		"preset-jtf-style/4.3.1.丸かっこ（）": true,
		"preset-jtf-style/4.3.2.大かっこ［］": true,
	},
};

/**
 * ユーザ設定を管理するクラス
 * @class UserSettings
 * @description シングルトンパターンを使用して、ユーザ設定を管理するクラス
 * @example
 * const userSettings = UserSettings.getInstance();
 * userSettings.someMethod();
 */
export class UserSettings {
	/** シングルトンインスタンス */
	private static instance: UserSettings;
	private connection: Connection;
	/** 隠されたコンストラクタ */
	private constructor(connection: Connection) {
		this.global = defaultSettings;
		this.connection = connection;
	}

	// public
	/**
	 * クライアントが `workspace/configuration` リクエストをサポートしているか？
	 * サポートしていない場合は、グローバル設定を使用
	 **/
	hasConfigurationCapability = false;
	// TODO: 理解してもしかしたらコメント解除
	// hasWorkspaceFolderCapability = false;
	// hasDiagnosticRelatedInformationCapability = false;

	/** すべてのドキュメントに共通する設定 */
	global: SettingsInterface = defaultSettings;

	/**
	 * ドキュメントごとの設定
	 * @key ドキュメントのURI
	 * @value 設定
	 */
	readonly ofDocuments = new Map<string, SettingsInterface>();

	/** このクラスのシングルトンインスタンスを取得 */
	static getInstanceWithConnection(connection: Connection) {
		if (!UserSettings.instance) {
			// インスタンスが存在しない場合は、新しいインスタンスを作成
			UserSettings.instance = new UserSettings(connection);
		} else {
			// すでにインスタンスが存在する場合は、connectionを更新
			UserSettings.instance.connection = connection;
		}
		return UserSettings.instance;
	}

	// 設定をリセットする
	clear() {
		this.global = defaultSettings;
		this.ofDocuments.clear();
	}

	// 値を設定する
	// 渡されなかった値はすでにある値を保持する
	setValues(values: Partial<SettingsInterface>) {
		// すでにある値を保持する
		this.global = {
			...this.global,
			...values,
		};
	}

	/**
	 * VSCode側の設定をキャッシュ
	 */
	async cacheDocumentSettings(
		resourceUri: string,
	) {
		if (!this.hasConfigurationCapability) {
			return Promise.resolve(this.global);
		}
		// this.ofDocuments に設定が記録されているか確認
		let result = this.ofDocuments.get(resourceUri);
		// 設定が記録されていない場合は、VSCode側の設定を取得
		if (!result) {
			result = await this.connection.workspace.getConfiguration({
				scopeUri: resourceUri,
				section: APP_ID,
			});
			if (result) { this.ofDocuments.set(resourceUri, result); }
		}
	}
	/**
	 * VSCode側の設定を取得します。
	 */
	getDocumentSettings(
		resourceUri: string,
	): SettingsInterface {
		// TODO: 見直し
		if (!this.hasConfigurationCapability) {
			return this.global;
		}
		// this.ofDocuments に設定が記録されているか確認
		const result = this.ofDocuments.get(resourceUri);
		// 設定が記録されていない場合は、VSCode側の設定を取得
		if (!result) {
			console.warn(
				`[${APP_ID}] getDocumentSettings: ${resourceUri} is not found.`);
			return this.global;
		}
		return result;
	}


	/**
	 * 設定で有効としているエラーかどうか判定します。
	 * @param document ドキュメント
	 * @param targetRuleId ルールのID
	 * @param message エラーメッセージ
	 * @returns true: 有効、false: 無効
	 */
	isTarget(
		document: TextDocument,
		targetRuleId: string,
		message: string,
	): boolean {
		// TODO: チェック
		const settings = this.getDocumentSettings(document.uri);
		let ret = false;

		for (const [ruleName, isEnabled] of Object.entries(settings["textlint-preset"])) {
			if (targetRuleId === "prh") {
				// prhのルールの場合

				// ruleIdからprh内の細かいルールを取得できないのでmessageに含まれているか取得している
				const ruleIdSub = ruleName.split("/")[1];
				if (message.includes(`（${ruleIdSub}）`)) {
					ret = !!(isEnabled);
				}
			} else if (ruleName.includes(targetRuleId)) {
				// 使用するルールのIDとエラーのルールIDが一致する場合

				// VSCodeの設定に存在しないルールは、デフォルト設定を使用します。
				// 例: ですます調、jtf-style/1.2.2
				ret = !!(isEnabled);
			}
		}
		return ret;
	};
}

