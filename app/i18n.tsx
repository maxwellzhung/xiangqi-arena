"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "zh-CN" | "zh-TW" | "en" | "ja";

export const localeOptions: ReadonlyArray<{
  value: Locale;
  label: string;
  shortLabel: string;
}> = [
  { value: "zh-CN", label: "中文（简体）", shortLabel: "中文" },
  { value: "zh-TW", label: "繁體中文", shortLabel: "繁中" },
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "ja", label: "日本語", shortLabel: "日本語" },
];

const english = {
  "language.label": "Language",
  "language.heading": "Language",
  "language.copy":
    "Choose the language used throughout Han vs Chu. This choice is saved on this device.",
  "nav.menu": "Menu",
  "nav.main": "Main navigation",
  "nav.play": "Play",
  "nav.learn": "Learn",
  "nav.leaderboard": "Leaderboard",
  "nav.settings": "Settings",
  "nav.signIn": "Sign in",
  "nav.playNow": "Play now",
  "brand.home": "Han vs Chu home",
  "footer.tagline": "Ancient strategy, played today.",
  "footer.rules": "Rules",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.settings": "Settings",
  "footer.navigation": "Footer",

  "home.guest": "Free guest play · No account needed",
  "home.titleLine1": "Cross the river.",
  "home.titleLine2": "Claim the dynasty.",
  "home.lede":
    "Learn and play Xiangqi—the strategy game behind the ancient rivalry of Chu and Han. The rules take minutes to begin and a lifetime to master.",
  "home.playNow": "Play now",
  "home.private": "Create private game",
  "home.learnLink": "New to Xiangqi? Learn the rules in 5 minutes",
  "home.statGuest": "GUEST ACCESS",
  "home.statGuestValue": "No account",
  "home.statTime": "TIME CONTROLS",
  "home.statTimeValue": "3 choices",
  "home.statLearn": "LEARN FIRST",
  "home.statLearnValue": "7 pieces",
  "home.waysToStart": "Ways to start",
  "home.quickMatch": "QUICK MATCH",
  "home.choosePace": "Choose your pace",
  "home.casual": "Casual guest game",
  "home.timeControls": "Time controls",
  "home.fiveMin": "5 min",
  "home.fastSharp": "Fast & sharp",
  "home.tenMin": "10 min",
  "home.roomThink": "Room to think",
  "home.popular": "POPULAR",
  "home.fifteen": "15+10",
  "home.deepPlay": "Deep play",
  "home.findOpponent": "Find an opponent",
  "home.guestNote": "You’ll play as a guest · Casual game",
  "home.benefits": "Product benefits",
  "home.speedTitle": "Three game speeds",
  "home.speedCopy": "Blitz, rapid, or 15+10",
  "home.guidanceTitle": "Learn as you play",
  "home.guidanceCopy": "Legal moves shown on board",
  "home.rulesTitle": "Real Xiangqi rules",
  "home.rulesCopy": "Complete, server-validated play",
  "home.reconnectTitle": "Reconnect safely",
  "home.reconnectCopy": "Your game stays in sync",
  "home.familiar": "FAMILIAR, BUT FRESH",
  "home.learnTitle": "Chess instincts. A whole new board.",
  "home.learnCopy":
    "If you know Western chess, you already have a head start. Here are three differences that make Xiangqi thrilling.",
  "home.diffBoardTitle": "The board is alive",
  "home.diffBoardCopy":
    "Pieces play on intersections. The river and two palaces shape every attack.",
  "home.diffCannonTitle": "Cannons need a screen",
  "home.diffCannonCopy":
    "A Cannon captures by leaping exactly one piece. It changes how every file feels.",
  "home.diffStalemateTitle": "No quiet stalemate",
  "home.diffStalemateCopy":
    "If you have no legal move, you lose. Xiangqi rewards active, tactical play.",
  "home.exploreLesson": "Explore the interactive lesson",

  "intro.play.eyebrow": "PLAY AS A GUEST",
  "intro.play.title": "Choose how you want to play",
  "intro.play.copy":
    "Start an untimed local game now. Private rooms and quick match use the same server-authoritative protocol when the standalone game service is connected.",
  "intro.play.guidedEyebrow": "GUIDED FIRST GAME",
  "intro.play.guidedTitle": "Learn while you play",
  "intro.play.guidedCopy":
    "Use opening prompts, visible legal destinations, coordinates, and plain-language explanations for every rejected move.",
  "intro.learn.eyebrow": "LEARN BY DOING · ABOUT 8 MINUTES",
  "intro.learn.title": "A familiar strategy. A different rhythm.",
  "intro.learn.copy":
    "Make real moves, see exactly why mistakes fail, and finish with a five-position practical readiness check. No account required.",
  "intro.leaderboard.eyebrow": "RATED 10+0 · THIS SEASON",
  "intro.leaderboard.title": "The Han vs Chu leaderboard",
  "intro.leaderboard.copy":
    "Ratings begin at 1500 and update only after completed rated games. Guest and casual games never affect the table.",
  "intro.settings.eyebrow": "YOUR DEVICE",
  "intro.settings.title": "Make the board yours",
  "intro.settings.copy":
    "Display, language, and sound choices are saved only on this device. They never affect game rules or server authority.",
  "intro.privacy.eyebrow": "LEGAL TEMPLATE · 17 JULY 2026",
  "intro.privacy.title": "Privacy policy",
  "intro.privacy.copy":
    "This plain-language template describes the intended MVP data practices. It is not legal advice and must be reviewed by qualified counsel before production use.",
  "intro.terms.eyebrow": "LEGAL TEMPLATE · 17 JULY 2026",
  "intro.terms.title": "Terms of service",
  "intro.terms.copy":
    "This working template covers the intended MVP. It is not legal advice and must be replaced or approved by qualified counsel before production use.",

  "settings.pieces": "Pieces",
  "settings.piecesCopy":
    "Western labels use G, A, E, H, R, C, and S. Traditional mode uses Chinese characters.",
  "settings.pieceDisplay": "Piece display",
  "settings.general": "G  General",
  "settings.traditional": "帥  Traditional",
  "settings.boardAids": "Board aids",
  "settings.coordinates": "Show file and rank coordinates",
  "settings.sound": "Play move and clock sounds",
  "settings.motion": "Use interface motion",
  "settings.save": "Save preferences",
  "settings.saved": "Saved on this device ✓",

  "play.available": "AVAILABLE NOW",
  "play.localTitle": "Local guided game",
  "play.localCopy":
    "Two players share this device. The complete rules engine validates every move, with legal destinations, history, captures, and check warnings.",
  "play.startLocal": "Start local game →",
  "play.authorityTitle": "What “server-authoritative” means",
  "play.authorityCopy":
    "The connected game service—not either browser—decides legal moves, clocks, versions, and results. Duplicate or delayed commands cannot apply twice.",
  "play.privateRoom": "PRIVATE ROOM",
  "play.knowTitle": "Play someone you know",
  "play.knowCopy":
    "Create a real server room, share its six-character code, and play from two browsers with authoritative moves and clocks.",
  "play.createRoom": "Create room",
  "play.quickMatch": "QUICK MATCH",
  "play.finding": "Finding an opponent…",
  "play.findTitle": "Find an opponent",
  "play.findCopy":
    "Join the casual guest queue. The service pairs players on the same clock and assigns colors fairly.",
  "play.cancelSearch": "Cancel search",
  "play.findCasual": "Find casual match",
  "play.online": "ONLINE PLAY",
  "play.createJoin": "Create or join a room",
  "play.connected": "Connected as {name}. {status}",
  "play.restoring": "Restoring live updates…",
  "play.liveOn": "Live updates are on.",
  "play.connecting": "Connecting to the authoritative game service…",
  "play.unavailable": "The authoritative game service is unavailable.",
  "play.timeControl": "Time control",
  "play.fiveMinutes": "5 minutes",
  "play.tenMinutes": "10 minutes",
  "play.fifteenMinutes": "15 minutes + 10 seconds",
  "play.orJoin": "OR JOIN",
  "play.roomCode": "Room code",
  "play.roomCodeA11y": "Six-character room code",
  "play.joinRoom": "Join room",
  "play.copyInvite": "Copy invite",
  "play.roomReady":
    "Room ready. Keep this page open while your opponent joins.",
  "play.serviceMissing":
    "Online play is not configured on this deployment. Local guided play remains available.",
  "play.serviceError":
    "The game service could not be reached. Please try again.",
  "play.enterCode": "Enter the six-character room code from your opponent.",
  "play.leftQueue": "You left the matchmaking queue.",
  "play.searching": "Searching for another guest. You can cancel at any time.",
  "play.notConnected": "Game service is not connected.",
} as const;

export type TranslationKey = keyof typeof english;
type TranslationTable = Partial<Record<TranslationKey, string>>;

const simplifiedChinese: TranslationTable = {
  "language.label": "语言",
  "language.heading": "语言",
  "language.copy": "选择楚汉的界面语言。此选择将保存在当前设备上。",
  "nav.menu": "菜单",
  "nav.main": "主导航",
  "nav.play": "对弈",
  "nav.learn": "学习",
  "nav.leaderboard": "排行榜",
  "nav.settings": "设置",
  "nav.signIn": "登录",
  "nav.playNow": "立即对弈",
  "brand.home": "楚汉首页",
  "footer.tagline": "古老谋略，今日对弈。",
  "footer.rules": "规则",
  "footer.privacy": "隐私",
  "footer.terms": "条款",
  "footer.settings": "设置",
  "footer.navigation": "页脚导航",
  "home.guest": "免费游客对弈 · 无需账户",
  "home.titleLine1": "越过楚河。",
  "home.titleLine2": "一局定江山。",
  "home.lede":
    "从楚汉相争的古老意象走进中国象棋。规则几分钟即可上手，变化却值得一生钻研。",
  "home.playNow": "立即对弈",
  "home.private": "创建私人对局",
  "home.learnLink": "第一次接触象棋？5 分钟学会规则",
  "home.statGuest": "游客访问",
  "home.statGuestValue": "无需账户",
  "home.statTime": "用时设置",
  "home.statTimeValue": "3 种选择",
  "home.statLearn": "先学规则",
  "home.statLearnValue": "7 类棋子",
  "home.waysToStart": "开始方式",
  "home.quickMatch": "快速匹配",
  "home.choosePace": "选择你的节奏",
  "home.casual": "游客休闲对局",
  "home.timeControls": "用时设置",
  "home.fiveMin": "5 分钟",
  "home.fastSharp": "快速凌厉",
  "home.tenMin": "10 分钟",
  "home.roomThink": "从容思考",
  "home.popular": "热门",
  "home.fifteen": "15+10",
  "home.deepPlay": "深入博弈",
  "home.findOpponent": "寻找对手",
  "home.guestNote": "你将以游客身份进行休闲对局",
  "home.benefits": "产品优势",
  "home.speedTitle": "三种对局速度",
  "home.speedCopy": "超快棋、快棋或 15+10",
  "home.guidanceTitle": "边下边学",
  "home.guidanceCopy": "棋盘显示合法走法",
  "home.rulesTitle": "完整象棋规则",
  "home.rulesCopy": "由服务器验证每一步",
  "home.reconnectTitle": "安全重连",
  "home.reconnectCopy": "对局始终保持同步",
  "home.familiar": "熟悉，又新鲜",
  "home.learnTitle": "熟悉的棋感，全新的棋盘。",
  "home.learnCopy":
    "如果你了解国际象棋，就已经拥有先发优势。以下三个差异，让中国象棋格外精彩。",
  "home.diffBoardTitle": "棋盘充满变化",
  "home.diffBoardCopy":
    "棋子走在线的交叉点上。楚河汉界与九宫影响着每一次进攻。",
  "home.diffCannonTitle": "炮需要炮架",
  "home.diffCannonCopy":
    "炮吃子时必须恰好隔着一个棋子，这让每条直线都充满张力。",
  "home.diffStalemateTitle": "困毙也判负",
  "home.diffStalemateCopy":
    "如果没有任何合法走法，你就输了。象棋鼓励积极的战术进攻。",
  "home.exploreLesson": "开始互动课程",
  "intro.play.eyebrow": "游客对弈",
  "intro.play.title": "选择你的对弈方式",
  "intro.play.copy":
    "立即开始不限时的本地对局。连接独立游戏服务后，私人房间和快速匹配会使用同一套服务器权威协议。",
  "intro.play.guidedEyebrow": "引导式首局",
  "intro.play.guidedTitle": "在对弈中学习",
  "intro.play.guidedCopy":
    "使用开局提示、可见的合法落点、坐标，以及每次非法走子的简明解释。",
  "intro.learn.eyebrow": "边做边学 · 约 8 分钟",
  "intro.learn.title": "熟悉的策略，不同的节奏。",
  "intro.learn.copy":
    "亲自走棋，准确了解错误原因，并以五个实战局面的准备度测试结束课程。无需账户。",
  "intro.leaderboard.eyebrow": "本赛季 · 10+0 等级分",
  "intro.leaderboard.title": "楚汉排行榜",
  "intro.leaderboard.copy":
    "等级分从 1500 开始，只在完成计分对局后更新。游客和休闲对局不会影响排行榜。",
  "intro.settings.eyebrow": "当前设备",
  "intro.settings.title": "按你的方式设置棋盘",
  "intro.settings.copy":
    "显示、语言和声音选择仅保存在当前设备上，不会改变对局规则或服务器判定。",
  "intro.privacy.eyebrow": "法律模板 · 2026 年 7 月 17 日",
  "intro.privacy.title": "隐私政策",
  "intro.privacy.copy":
    "这份简明模板说明 MVP 计划采用的数据实践。它不构成法律意见，正式上线前必须由合格法律顾问审阅。",
  "intro.terms.eyebrow": "法律模板 · 2026 年 7 月 17 日",
  "intro.terms.title": "服务条款",
  "intro.terms.copy":
    "这份工作模板涵盖 MVP 的计划范围。它不构成法律意见，正式上线前必须由合格法律顾问替换或批准。",
  "settings.pieces": "棋子",
  "settings.piecesCopy":
    "西式标记使用 G、A、E、H、R、C、S；传统模式使用中文棋子。",
  "settings.pieceDisplay": "棋子显示",
  "settings.general": "G  西式",
  "settings.traditional": "帥  传统",
  "settings.boardAids": "棋盘辅助",
  "settings.coordinates": "显示纵线与横线坐标",
  "settings.sound": "播放走子与计时声音",
  "settings.motion": "启用界面动效",
  "settings.save": "保存偏好",
  "settings.saved": "已保存到此设备 ✓",
  "play.available": "现在可用",
  "play.localTitle": "本地引导对局",
  "play.localCopy":
    "两位玩家共用一台设备。完整规则引擎会验证每一步，并显示合法落点、历史、吃子和将军提示。",
  "play.startLocal": "开始本地对局 →",
  "play.authorityTitle": "什么是“服务器权威”",
  "play.authorityCopy":
    "由连接的游戏服务而不是任一浏览器决定合法走法、计时、版本和结果。重复或延迟的指令不会执行两次。",
  "play.privateRoom": "私人房间",
  "play.knowTitle": "与认识的人对弈",
  "play.knowCopy":
    "创建真实的服务器房间，分享六位房间码，在两个浏览器中进行由服务器判定走子与计时的对局。",
  "play.createRoom": "创建房间",
  "play.quickMatch": "快速匹配",
  "play.finding": "正在寻找对手…",
  "play.findTitle": "寻找对手",
  "play.findCopy":
    "加入游客休闲队列，系统会匹配相同用时的玩家并公平分配红黑方。",
  "play.cancelSearch": "取消搜索",
  "play.findCasual": "开始休闲匹配",
  "play.online": "在线对弈",
  "play.createJoin": "创建或加入房间",
  "play.connected": "已以 {name} 身份连接。{status}",
  "play.restoring": "正在恢复实时更新…",
  "play.liveOn": "实时更新已开启。",
  "play.connecting": "正在连接权威游戏服务…",
  "play.unavailable": "权威游戏服务暂不可用。",
  "play.timeControl": "用时设置",
  "play.fiveMinutes": "5 分钟",
  "play.tenMinutes": "10 分钟",
  "play.fifteenMinutes": "15 分钟 + 每步 10 秒",
  "play.orJoin": "或加入",
  "play.roomCode": "房间码",
  "play.roomCodeA11y": "六位房间码",
  "play.joinRoom": "加入房间",
  "play.copyInvite": "复制邀请",
  "play.roomReady": "房间已就绪。请在对手加入前保持此页面打开。",
  "play.serviceMissing": "此部署尚未配置在线对弈，本地引导对局仍可使用。",
  "play.serviceError": "无法连接游戏服务，请重试。",
  "play.enterCode": "请输入对手提供的六位房间码。",
  "play.leftQueue": "你已退出匹配队列。",
  "play.searching": "正在寻找另一位游客，你可以随时取消。",
  "play.notConnected": "游戏服务尚未连接。",
};

const traditionalChinese: TranslationTable = {
  ...simplifiedChinese,
  "language.label": "語言",
  "language.heading": "語言",
  "language.copy": "選擇楚漢的介面語言。此選擇將儲存在目前裝置上。",
  "nav.menu": "選單",
  "nav.main": "主導覽",
  "nav.play": "對弈",
  "nav.learn": "學習",
  "nav.leaderboard": "排行榜",
  "nav.settings": "設定",
  "nav.signIn": "登入",
  "nav.playNow": "立即對弈",
  "brand.home": "楚漢首頁",
  "footer.tagline": "古老謀略，今日對弈。",
  "footer.rules": "規則",
  "footer.privacy": "隱私",
  "footer.terms": "條款",
  "footer.settings": "設定",
  "footer.navigation": "頁尾導覽",
  "home.guest": "免費訪客對弈 · 無需帳戶",
  "home.titleLine1": "越過楚河。",
  "home.titleLine2": "一局定江山。",
  "home.lede":
    "從楚漢相爭的古老意象走進中國象棋。規則幾分鐘即可上手，變化卻值得一生鑽研。",
  "home.playNow": "立即對弈",
  "home.private": "建立私人對局",
  "home.learnLink": "第一次接觸象棋？5 分鐘學會規則",
  "home.statGuest": "訪客存取",
  "home.statGuestValue": "無需帳戶",
  "home.statTime": "用時設定",
  "home.statTimeValue": "3 種選擇",
  "home.statLearn": "先學規則",
  "home.statLearnValue": "7 類棋子",
  "home.waysToStart": "開始方式",
  "home.quickMatch": "快速配對",
  "home.choosePace": "選擇你的節奏",
  "home.casual": "訪客休閒對局",
  "home.timeControls": "用時設定",
  "home.fiveMin": "5 分鐘",
  "home.fastSharp": "快速凌厲",
  "home.tenMin": "10 分鐘",
  "home.roomThink": "從容思考",
  "home.popular": "熱門",
  "home.fifteen": "15+10",
  "home.deepPlay": "深入博弈",
  "home.findOpponent": "尋找對手",
  "home.guestNote": "你將以訪客身分進行休閒對局",
  "home.benefits": "產品優勢",
  "home.speedTitle": "三種對局速度",
  "home.speedCopy": "超快棋、快棋或 15+10",
  "home.guidanceTitle": "邊下邊學",
  "home.guidanceCopy": "棋盤顯示合法走法",
  "home.rulesTitle": "完整象棋規則",
  "home.rulesCopy": "由伺服器驗證每一步",
  "home.reconnectTitle": "安全重新連線",
  "home.reconnectCopy": "對局始終保持同步",
  "home.familiar": "熟悉，又新鮮",
  "home.learnTitle": "熟悉的棋感，全新的棋盤。",
  "home.learnCopy":
    "如果你了解西洋棋，就已經擁有先發優勢。以下三個差異，讓中國象棋格外精彩。",
  "home.diffBoardTitle": "棋盤充滿變化",
  "home.diffBoardCopy":
    "棋子走在線的交叉點上。楚河漢界與九宮影響著每一次進攻。",
  "home.diffCannonTitle": "炮需要炮架",
  "home.diffCannonCopy": "炮吃子時必須恰好隔著一個棋子，讓每條直線都充滿張力。",
  "home.diffStalemateTitle": "困斃也判負",
  "home.diffStalemateCopy":
    "如果沒有任何合法走法，你就輸了。象棋鼓勵積極的戰術進攻。",
  "home.exploreLesson": "開始互動課程",
  "intro.play.eyebrow": "訪客對弈",
  "intro.play.title": "選擇你的對弈方式",
  "intro.play.copy":
    "立即開始不限時的本機對局。連接獨立遊戲服務後，私人房間和快速配對會使用同一套伺服器權威協定。",
  "intro.play.guidedEyebrow": "引導式首局",
  "intro.play.guidedTitle": "在對弈中學習",
  "intro.play.guidedCopy":
    "使用開局提示、可見的合法落點、座標，以及每次非法走子的簡明解釋。",
  "intro.learn.eyebrow": "邊做邊學 · 約 8 分鐘",
  "intro.learn.title": "熟悉的策略，不同的節奏。",
  "intro.learn.copy":
    "親自走棋，準確了解錯誤原因，並以五個實戰局面的準備度測驗結束課程。無需帳戶。",
  "intro.leaderboard.eyebrow": "本賽季 · 10+0 等級分",
  "intro.leaderboard.title": "楚漢排行榜",
  "intro.leaderboard.copy":
    "等級分從 1500 開始，只在完成計分對局後更新。訪客和休閒對局不會影響排行榜。",
  "intro.settings.eyebrow": "目前裝置",
  "intro.settings.title": "依你的方式設定棋盤",
  "intro.settings.copy":
    "顯示、語言和聲音選擇僅儲存在目前裝置上，不會改變對局規則或伺服器判定。",
  "intro.privacy.eyebrow": "法律範本 · 2026 年 7 月 17 日",
  "intro.privacy.title": "隱私政策",
  "intro.privacy.copy":
    "這份簡明範本說明 MVP 預計採用的資料實務。它不構成法律意見，正式上線前必須由合格法律顧問審閱。",
  "intro.terms.eyebrow": "法律範本 · 2026 年 7 月 17 日",
  "intro.terms.title": "服務條款",
  "intro.terms.copy":
    "這份工作範本涵蓋 MVP 的預計範圍。它不構成法律意見，正式上線前必須由合格法律顧問替換或核准。",
  "settings.pieces": "棋子",
  "settings.piecesCopy":
    "西式標記使用 G、A、E、H、R、C、S；傳統模式使用中文棋子。",
  "settings.pieceDisplay": "棋子顯示",
  "settings.general": "G  西式",
  "settings.traditional": "帥  傳統",
  "settings.boardAids": "棋盤輔助",
  "settings.coordinates": "顯示縱線與橫線座標",
  "settings.sound": "播放走子與計時聲音",
  "settings.motion": "啟用介面動效",
  "settings.save": "儲存偏好",
  "settings.saved": "已儲存到此裝置 ✓",
  "play.available": "現在可用",
  "play.localTitle": "本機引導對局",
  "play.localCopy":
    "兩位玩家共用一台裝置。完整規則引擎會驗證每一步，並顯示合法落點、歷史、吃子和將軍提示。",
  "play.startLocal": "開始本機對局 →",
  "play.authorityTitle": "什麼是「伺服器權威」",
  "play.authorityCopy":
    "由連接的遊戲服務而非任一瀏覽器決定合法走法、計時、版本和結果。重複或延遲的指令不會執行兩次。",
  "play.privateRoom": "私人房間",
  "play.knowTitle": "與認識的人對弈",
  "play.knowCopy":
    "建立真實的伺服器房間，分享六位房間碼，在兩個瀏覽器中進行由伺服器判定走子與計時的對局。",
  "play.createRoom": "建立房間",
  "play.quickMatch": "快速配對",
  "play.finding": "正在尋找對手…",
  "play.findTitle": "尋找對手",
  "play.findCopy":
    "加入訪客休閒佇列，系統會配對相同用時的玩家並公平分配紅黑方。",
  "play.cancelSearch": "取消搜尋",
  "play.findCasual": "開始休閒配對",
  "play.online": "線上對弈",
  "play.createJoin": "建立或加入房間",
  "play.connected": "已以 {name} 身分連線。{status}",
  "play.restoring": "正在恢復即時更新…",
  "play.liveOn": "即時更新已開啟。",
  "play.connecting": "正在連接權威遊戲服務…",
  "play.unavailable": "權威遊戲服務暫時無法使用。",
  "play.timeControl": "用時設定",
  "play.fiveMinutes": "5 分鐘",
  "play.tenMinutes": "10 分鐘",
  "play.fifteenMinutes": "15 分鐘 + 每步 10 秒",
  "play.orJoin": "或加入",
  "play.roomCode": "房間碼",
  "play.roomCodeA11y": "六位房間碼",
  "play.joinRoom": "加入房間",
  "play.copyInvite": "複製邀請",
  "play.roomReady": "房間已就緒。請在對手加入前保持此頁面開啟。",
  "play.serviceMissing": "此部署尚未設定線上對弈，本機引導對局仍可使用。",
  "play.serviceError": "無法連接遊戲服務，請再試一次。",
  "play.enterCode": "請輸入對手提供的六位房間碼。",
  "play.leftQueue": "你已退出配對佇列。",
  "play.searching": "正在尋找另一位訪客，你可以隨時取消。",
  "play.notConnected": "遊戲服務尚未連接。",
};

const japanese: TranslationTable = {
  "language.label": "言語",
  "language.heading": "言語",
  "language.copy":
    "Han vs Chu で使用する表示言語を選択します。この設定はこの端末に保存されます。",
  "nav.menu": "メニュー",
  "nav.main": "メインナビゲーション",
  "nav.play": "対局",
  "nav.learn": "学ぶ",
  "nav.leaderboard": "ランキング",
  "nav.settings": "設定",
  "nav.signIn": "ログイン",
  "nav.playNow": "今すぐ対局",
  "brand.home": "Han vs Chu ホーム",
  "footer.tagline": "古代の戦略を、いま対局へ。",
  "footer.rules": "ルール",
  "footer.privacy": "プライバシー",
  "footer.terms": "利用規約",
  "footer.settings": "設定",
  "footer.navigation": "フッター",
  "home.guest": "ゲスト対局無料 · アカウント不要",
  "home.titleLine1": "河を越え、",
  "home.titleLine2": "天下をつかめ。",
  "home.lede":
    "楚漢の古代の対立を映すシャンチーを学び、対局しましょう。数分で始められ、一生をかけて深められる戦略ゲームです。",
  "home.playNow": "今すぐ対局",
  "home.private": "プライベート対局を作成",
  "home.learnLink": "初めてですか？5分でルールを学ぶ",
  "home.statGuest": "ゲスト利用",
  "home.statGuestValue": "アカウント不要",
  "home.statTime": "持ち時間",
  "home.statTimeValue": "3種類",
  "home.statLearn": "まず学ぶ",
  "home.statLearnValue": "7種の駒",
  "home.waysToStart": "始め方",
  "home.quickMatch": "クイックマッチ",
  "home.choosePace": "ペースを選ぶ",
  "home.casual": "ゲストカジュアル対局",
  "home.timeControls": "持ち時間",
  "home.fiveMin": "5分",
  "home.fastSharp": "速く鋭く",
  "home.tenMin": "10分",
  "home.roomThink": "考える余裕",
  "home.popular": "人気",
  "home.fifteen": "15+10",
  "home.deepPlay": "じっくり対局",
  "home.findOpponent": "対戦相手を探す",
  "home.guestNote": "ゲストとしてカジュアル対局を行います",
  "home.benefits": "サービスの特長",
  "home.speedTitle": "3つの対局速度",
  "home.speedCopy": "ブリッツ、ラピッド、15+10",
  "home.guidanceTitle": "対局しながら学ぶ",
  "home.guidanceCopy": "合法手を盤上に表示",
  "home.rulesTitle": "正式なシャンチールール",
  "home.rulesCopy": "サーバーがすべての手を検証",
  "home.reconnectTitle": "安全に再接続",
  "home.reconnectCopy": "対局状態を常に同期",
  "home.familiar": "親しみやすく、新しい",
  "home.learnTitle": "チェスの感覚で、新しい盤へ。",
  "home.learnCopy":
    "チェスを知っていれば、すでに一歩リードしています。シャンチーを刺激的にする3つの違いを紹介します。",
  "home.diffBoardTitle": "盤面そのものが戦略",
  "home.diffBoardCopy":
    "駒は線の交点に置きます。河と2つの宮が攻めの形を変えます。",
  "home.diffCannonTitle": "炮にはスクリーンが必要",
  "home.diffCannonCopy":
    "炮は駒を1つだけ飛び越えて取ります。縦横のすべてのラインに緊張感が生まれます。",
  "home.diffStalemateTitle": "ステイルメイトも敗北",
  "home.diffStalemateCopy":
    "合法手がなければ負けです。シャンチーでは積極的な戦術が報われます。",
  "home.exploreLesson": "インタラクティブレッスンへ",
  "intro.play.eyebrow": "ゲストで対局",
  "intro.play.title": "対局方法を選ぶ",
  "intro.play.copy":
    "時間無制限のローカル対局をすぐに開始できます。ゲームサービス接続時は、プライベートルームとクイックマッチで同じサーバー権威プロトコルを使用します。",
  "intro.play.guidedEyebrow": "ガイド付き初対局",
  "intro.play.guidedTitle": "対局しながら学ぶ",
  "intro.play.guidedCopy":
    "序盤のヒント、合法手の表示、座標、不正な手へのわかりやすい説明を利用できます。",
  "intro.learn.eyebrow": "実践で学ぶ · 約8分",
  "intro.learn.title": "なじみのある戦略、新しいリズム。",
  "intro.learn.copy":
    "実際に駒を動かし、なぜ手が失敗するのかを確認し、5つの実戦局面による理解度チェックで仕上げます。アカウントは不要です。",
  "intro.leaderboard.eyebrow": "今シーズン · レーティング 10+0",
  "intro.leaderboard.title": "Han vs Chu ランキング",
  "intro.leaderboard.copy":
    "レーティングは1500から始まり、完了したレート戦の後だけ更新されます。ゲスト戦とカジュアル戦はランキングに影響しません。",
  "intro.settings.eyebrow": "この端末",
  "intro.settings.title": "自分好みの盤に",
  "intro.settings.copy":
    "表示・言語・音の設定はこの端末だけに保存され、ルールやサーバー判定には影響しません。",
  "intro.privacy.eyebrow": "法務テンプレート · 2026年7月17日",
  "intro.privacy.title": "プライバシーポリシー",
  "intro.privacy.copy":
    "この平易なテンプレートはMVPで想定するデータ取扱いを説明するものです。法的助言ではなく、本番利用前に資格を持つ専門家の確認が必要です。",
  "intro.terms.eyebrow": "法務テンプレート · 2026年7月17日",
  "intro.terms.title": "利用規約",
  "intro.terms.copy":
    "この作業用テンプレートはMVPの想定範囲を扱います。法的助言ではなく、本番利用前に資格を持つ専門家による差し替えまたは承認が必要です。",
  "settings.pieces": "駒",
  "settings.piecesCopy":
    "欧文表示では G、A、E、H、R、C、S を使い、伝統表示では漢字を使います。",
  "settings.pieceDisplay": "駒の表示",
  "settings.general": "G  欧文",
  "settings.traditional": "帥  伝統",
  "settings.boardAids": "盤面ガイド",
  "settings.coordinates": "筋と段の座標を表示",
  "settings.sound": "着手音と時計音を再生",
  "settings.motion": "画面のアニメーションを使用",
  "settings.save": "設定を保存",
  "settings.saved": "この端末に保存しました ✓",
  "play.available": "利用可能",
  "play.localTitle": "ガイド付きローカル対局",
  "play.localCopy":
    "2人で1台の端末を共有します。完全なルールエンジンが合法手、棋譜、駒取り、王手を検証して表示します。",
  "play.startLocal": "ローカル対局を開始 →",
  "play.authorityTitle": "「サーバー権威」とは",
  "play.authorityCopy":
    "どちらのブラウザでもなく、接続されたゲームサービスが合法手、時計、バージョン、結果を決定します。重複・遅延した命令は二重適用されません。",
  "play.privateRoom": "プライベートルーム",
  "play.knowTitle": "知り合いと対局",
  "play.knowCopy":
    "サーバールームを作り、6文字のコードを共有して、2つのブラウザからサーバー判定の着手と時計で対局します。",
  "play.createRoom": "ルームを作成",
  "play.quickMatch": "クイックマッチ",
  "play.finding": "対戦相手を検索中…",
  "play.findTitle": "対戦相手を探す",
  "play.findCopy":
    "ゲストのカジュアル待機列に参加します。同じ持ち時間のプレイヤーを組み合わせ、先後を公平に割り当てます。",
  "play.cancelSearch": "検索をキャンセル",
  "play.findCasual": "カジュアル対局を探す",
  "play.online": "オンライン対局",
  "play.createJoin": "ルームを作成または参加",
  "play.connected": "{name} として接続。{status}",
  "play.restoring": "ライブ更新を復元中…",
  "play.liveOn": "ライブ更新は有効です。",
  "play.connecting": "ゲームサービスに接続中…",
  "play.unavailable": "ゲームサービスを利用できません。",
  "play.timeControl": "持ち時間",
  "play.fiveMinutes": "5分",
  "play.tenMinutes": "10分",
  "play.fifteenMinutes": "15分 + 1手10秒",
  "play.orJoin": "または参加",
  "play.roomCode": "ルームコード",
  "play.roomCodeA11y": "6文字のルームコード",
  "play.joinRoom": "ルームに参加",
  "play.copyInvite": "招待をコピー",
  "play.roomReady":
    "ルームの準備ができました。相手が参加するまでこのページを開いたままにしてください。",
  "play.serviceMissing":
    "この環境ではオンライン対局が設定されていません。ガイド付きローカル対局は利用できます。",
  "play.serviceError":
    "ゲームサービスに接続できませんでした。もう一度お試しください。",
  "play.enterCode": "相手から届いた6文字のルームコードを入力してください。",
  "play.leftQueue": "マッチング待機列から退出しました。",
  "play.searching": "別のゲストを探しています。いつでもキャンセルできます。",
  "play.notConnected": "ゲームサービスに接続されていません。",
};

const translations: Record<Exclude<Locale, "en">, TranslationTable> = {
  "zh-CN": simplifiedChinese,
  "zh-TW": traditionalChinese,
  ja: japanese,
};

const STORAGE_KEY = "xiangqi-arena-locale";

function localeFromLanguage(
  language: string | null | undefined,
): Locale | null {
  if (!language) return null;
  const normalized = language.toLowerCase();
  if (
    normalized.startsWith("zh-tw") ||
    normalized.startsWith("zh-hk") ||
    normalized.startsWith("zh-hant")
  ) {
    return "zh-TW";
  }
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("en")) return "en";
  return null;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    key: TranslationKey,
    variables?: Record<string, string | number>,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = localeFromLanguage(localStorage.getItem(STORAGE_KEY));
      const detected = navigator.languages
        .map(localeFromLanguage)
        .find((value): value is Locale => value !== null);
      // Reading a device-local preference is the intended one-time hydration step.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored ?? detected ?? "en");
    } catch {
      setLocaleState(localeFromLanguage(navigator.language) ?? "en");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    function syncLocale(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const next = localeFromLanguage(event.newValue);
      if (next) setLocaleState(next);
    }
    window.addEventListener("storage", syncLocale);
    return () => window.removeEventListener("storage", syncLocale);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private storage can be unavailable */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, variables: Record<string, string | number> = {}) => {
      const template =
        locale === "en"
          ? english[key]
          : (translations[locale][key] ?? english[key]);
      return Object.entries(variables).reduce(
        (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLanguage() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useLanguage must be used inside I18nProvider");
  return context;
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label className={compact ? "language-select compact" : "language-select"}>
      <span className={compact ? "sr-only" : undefined}>
        {t("language.label")}
      </span>
      <select
        value={locale}
        aria-label={t("language.label")}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
