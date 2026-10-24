export const codeRepositorySelections = new Map([
	[132, ['TestRxUniversal']],
	[275, ['PivotWithoutSwipe']],
	[634, ['SimplePdfViewer']],
	[670, ['ExpandableDetailGridView']],
	[701, ['CompiledBindingsInterfaceTest']],
	[721, ['RemoveEmptyRuns']],
	[804, ['Auto-GPX-location-updater-iOS-simulator']],
	[848, ['SimpleRealmObjectServerExample']],
	[901, ['XamarinFormsLocalization']],
	[938, ['SimpleRealmChat']],
	[953, ['StreamingAppWithContinueWatching']],
	[963, ['SqlClientOnUWP']],
	[977, ['RealmShoppingListDemo', 'EmotionPicture']],
	[990, ['HyperlinkLabel']],
	[1025, ['MineSweepingNinja']],
	[1071, ['SimplePdfViewer']],
	[1100, ['SimplePdfViewer']],
	[1134, ['UwpConsoleApp']],
	[1164, ['DisneyCastleClassification']],
	[1197, ['DisneyCastleClassificationCoreML']],
	[1247, ['HyperlinkLabel']],
	[1340, ['MultiTargetingDemo']],
	[1414, ['WinMLDemo']],
	[1491, ['SimpleDataValidator']],
	[1618, ['eIDReader']],
	[1828, ['MAUI_MVVM_Demo']],
	[1897, ['whisper-playground']],
	[1949, ['Whisper-translate']],
].map(([id, repositories]) => [id, repositories.map((repository) => `https://github.com/PieEatingNinjas/${repository}`)]));

export const codeLanguageResolutions = new Map([
	[451, { 0: 'xml', 1: 'xml', 2: 'xml', 3: 'xml' }],
	[1319, { 0: 'text' }],
	[1340, { 0: 'xml', 1: 'xml', 2: 'xml', 3: 'empty', 4: 'csharp', 5: 'csharp', 6: 'csharp' }],
	[1395, { 0: 'csharp', 1: 'csharp' }],
	[1734, { 0: 'bash' }],
	[1805, { 0: 'bash', 1: 'text' }],
	[1818, { 0: 'csharp' }],
	[1949, { 8: 'csharp' }],
	[2012, { 2: 'text', 3: 'text', 6: 'bash' }],
]);

const officialDocumentation = 'https://github.com/Fedict/eid-mw/blob/master/doc/sdk/documentation/Applet%201.7%20eID%20Cards/';
export const documentLinks = new Map([
	['2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf',
		`${officialDocumentation}Public_Belpic_Applet_v1%207_Ref_Manual%20-%20A01.pdf`],
	['2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf',
		`${officialDocumentation}belgian_electronic_identity_card_content_v2.8.a.pdf`],
]);

export const externalScreenshot = 'https://pbs.twimg.com/media/GMggKuTWIAA-nhj?format=jpg&name=medium';
export const externalScreenshotLocal = '2024/05/xamarin-archived.jpg';
export const preferredWidths = new Map([
	['2023/12/cover_image-scaled.jpg', 800],
	['2020/12/version2.jpg', 1440],
	['2020/12/version.jpg', 1440],
	['2023/12/deployGTP35.png', 1440],
	['2023/10/OIG2.jpg', 1440],
	['2020/02/ReadAPDU.jpg', 1440],
	['2016/02/pdf-print-screen.png', 1440],
	['2020/02/SelectAPDU.jpg', 1440],
	['2016/10/ExpandableDetailGridView.gif', 600],
	['2022/02/MauiNavigation.gif', 600],
]);
