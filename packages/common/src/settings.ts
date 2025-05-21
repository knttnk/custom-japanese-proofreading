
import { Connection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { APP_CONFIG_HEADER, APP_ID } from './index';

/**
 * ユーザ設定のインターフェース
 */
interface SettingsInterface {
	/** 問題を表示する最大数 */
	"maxNumberOfProblems": number;
	"textlintrcPaths": string[];
	/**
	 * 拡張機能側で提供する、
	 * 使用頻度が高いと思われるルールの設定
	 */
	"textlintPreset": {
		/** 許容できる最大の読点の数 */
		"preset-japanese/max-ten": boolean;
		/** 逆接の「が」の複数回出現を許容しない */
		"preset-japanese/no-doubled-conjunctive-particle-ga": boolean;
		/** 接続詞の連続を許容しない */
		"preset-japanese/no-doubled-conjunction": boolean;
		/** 二重否定を許容しない */
		"preset-japanese/no-double-negative-ja": boolean;
		/** 助詞の連続を許容しない */
		"preset-japanese/no-doubled-joshi": boolean;
		/** ら抜き言葉を許容しない */
		"preset-japanese/no-dropping-the-ra": boolean;
		/** ですます調とである調を混ぜない */
		"preset-japanese/no-mix-dearu-desumasu": boolean;
		/** 不自然な濁点を検出 */
		"preset-japanese/no-nfd": boolean;
		/** 制御文字を検出 */
		"preset-japanese/no-invalid-control-character": boolean;
		/** ゼロ幅スペースを検出 */
		"preset-japanese/no-zero-width-spaces": boolean;
		/** 康煕部首を検出 */
		"preset-japanese/no-kangxi-radicals": boolean;
		/** 【テキスト校正くん】誤字の検出 */
		"prh/goji": boolean;
		/** 【テキスト校正くん】重言の検出 */
		"prh/jugen": boolean;
		/** 【テキスト校正くん】開く漢字の検出 */
		"prh/hiraku-kanji": boolean;
		/** 【テキスト校正くん】冗長な表現の検出 */
		"prh/jocho": boolean;
		/** 【テキスト校正くん】固有名詞 */
		"prh/koyu-meishi": boolean;
		/** 【テキスト校正くん】技術用語 */
		"prh/technical-term": boolean;
		// preset-jtf-style
		"preset-jtf-style/2.1.8.算用数字": boolean;
		"preset-jtf-style/2.1.9.アルファベット": boolean;
		"preset-jtf-style/2.2.2.算用数字と漢数字の使い分け": boolean;
		"preset-jtf-style/2.2.3.一部の助数詞の表記": boolean;
		"preset-jtf-style/3.1.1.全角文字と半角文字の間": boolean;
		"preset-jtf-style/3.1.2.全角文字どうし": boolean;
		"preset-jtf-style/3.3.かっこ類と隣接する文字の間のスペースの有無": boolean;
		"preset-jtf-style/4.2.2.疑問符(？)": boolean;
		"preset-jtf-style/4.2.6.ハイフン(-)": boolean;
		"preset-jtf-style/4.2.9.ダッシュ(-)": boolean;
		"preset-jtf-style/4.3.1.丸かっこ（）": boolean;
		"preset-jtf-style/4.3.2.大かっこ［］": boolean;
	};
}

/**
 * 設定のデフォルト値
 */
const defaultSettings: Readonly<SettingsInterface> = {
	"maxNumberOfProblems": 100,
	"textlintrcPaths": ["./.vscode/.textlintrc"],
	"textlintPreset": {
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
	/** 隠されたコンストラクタ */
	private constructor(connection: Connection) {
		this.globalDefault = defaultSettings;
		this.connection = connection;
	}

	// public
	/**
	 * クライアントが `workspace/configuration` リクエストをサポートしているか？
	 * サポートしていない場合は、グローバル設定を使用
	 **/
	hasConfigurationCapability = false;
	// hasWorkspaceFolderCapability = false;
	// hasDiagnosticRelatedInformationCapability = false;

	/** 
	 * すべてのドキュメントに共通する設定
	 * 書き換えられない。
	 */
	readonly globalDefault: SettingsInterface = defaultSettings;
	connection: Connection;

	/**
	 * ドキュメントごとの設定
	 * @key ドキュメントのURI
	 * @value 設定
	 */
	readonly ofDocuments: Map<string, SettingsInterface> = new Map<string, SettingsInterface>();


	/** このクラスのシングルトンインスタンスを取得 */
	static getInstance(connection: Connection) {
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
		this.ofDocuments.clear();
	}

	/**
	 * resourceUriに対する設定をキャッシュする
	 * 
	 * このuriのドキュメントの校正の前に
	 * 必ず呼ばれているようにすること。
	 */
	async cacheDocumentSettings(
		resourceUri: string,
	) {
		if (!this.hasConfigurationCapability) {
			return Promise.resolve(this.globalDefault);
		}
		// this.ofDocuments に設定が記録されているか確認
		const result = this.ofDocuments.get(resourceUri);
		// 設定が記録されていない場合は、VSCode側の設定を取得
		if (!result) {
			const result2 = await this.connection.workspace.getConfiguration({
				scopeUri: resourceUri,
				section: APP_CONFIG_HEADER,
			});
			const ret: SettingsInterface = this.globalDefault;
			// 代入
			ret["maxNumberOfProblems"] = result2["maxNumberOfProblems"] ?? ret["maxNumberOfProblems"];
			ret["textlintrcPaths"] = result2["textlintrcPaths"] ?? ret["textlintrcPaths"];
			const textlintPreset = "textlintPreset";
			if (result2[textlintPreset] !== undefined) {
				const keyArray = Object.keys(ret[textlintPreset]) as (keyof SettingsInterface["textlintPreset"])[];
				for (const textlintKey of keyArray) {
					const newValue = result2[textlintPreset][textlintKey];
					if (newValue !== undefined) {
						ret[textlintPreset][textlintKey] = newValue as boolean;
					}
				}
			}
			console.debug(
				`[${APP_ID}]: config of ${resourceUri} => ${JSON.stringify(ret)}`,
			);
			this.ofDocuments.set(resourceUri, ret);
		}
	}

	/**
	 * VSCode側の設定を取得します。
	 */
	getDocumentSettings(
		resourceUri: string,
	): SettingsInterface {
		if (!this.hasConfigurationCapability) {
			return this.globalDefault;
		}
		// this.ofDocuments に設定が記録されているか確認
		const result = this.ofDocuments.get(resourceUri);
		// 設定が記録されていない場合は、VSCode側の設定を取得
		if (!result) {
			console.warn(
				`[${APP_ID}] getDocumentSettings: ${resourceUri} is not found.`);
			return this.globalDefault;
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

		for (const [ruleName, isEnabled] of Object.entries(settings["textlintPreset"])) {
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

