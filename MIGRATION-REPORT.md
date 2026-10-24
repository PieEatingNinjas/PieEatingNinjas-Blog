# WordPress → Astro migration report

Source: `_migration/pieeatingninjas039blog.WordPress.2026-10-24.xml` (WXR 1.2 export of https://blog.pieeatingninjas.be) and the site dump in `_migration/blog` + `_migration/` root.

> `_migration/` is gitignored. All paths below are relative to `_migration/`; uploads are relative to `blog/wp-content/uploads/`.

## Summary

| Item | Count | Action |
|---|---|---|
| Published blog posts | 62 | **Migrate** |
| Draft posts | 5 | **Do not migrate** |
| Pages | 6 | Migrate 4 (About, Book, Privacy Policy, 404); skip 2 placeholders |
| Unique asset files used by posts/pages (originals) | 125 | **Migrate** (original size only) |
| Images that contain **code** without annotations (🔴) | 7 | **Replace with a code block**; see [extracted code report](./IMAGE-CODE-EXTRACTION-REPORT.md) |
| Images that mix code + IDE/UI/result or annotations (🟠) | 12 | Reviewed – **keep as image** |
| Images showing console/terminal output (🟢) | 8 | Keep as image |
| Images to resize / optimize (📏) | 20 | Resize or recompress before migrating (see section 3b) |
| External images hot-linked in posts | 1 | Download & self-host |
| Approved comments | 196 | Decide (export / drop / external comment system) |
| Categories / tags | 44 / 7 | Map to Astro content-collection `tags` |
| PHP files in the dump | 5870 | **Do not migrate** |

Legend: 🔴 = source code without annotations → must become text code block · 🟠 = code shown together with IDE tooling, debugger, rendered output or annotations (lines, arrows, circles, markers) → reviewed, keep as image · 🟢 = console / terminal / output-window → keep as image. Counts are unique original files; an image reused by multiple posts is counted once.

## 1. Blog posts to migrate (published)

Permalink structure on WordPress: `/YYYY/MM/DD/<slug>/` – keep these URLs (or add redirects) so existing links and search results keep working.

| # | Date | Title | Slug | Categories | Assets | 🔴 | 🟠 | 🟢 | Comments |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2015-11-05 | Starting a blog since 2011... | `starting-a-blog-since-2011` | Welcome | 1 |  |  |  |  |
| 2 | 2015-11-07 | Deferred Loading, mind the Visual State Manager | `deferred-loading-mind-the-visual-state-manager` | Performance, UWP, XAML | 6 | 2 | 3 |  |  |
| 3 | 2015-11-14 | Using Rx in a UWP project with MVVM | `using-rx-in-a-uwp-project-with-mvvm` | C#, MVVM, Rx, UWP |  |  |  |  |  |
| 4 | 2015-11-15 | x:Bind and inheritance | `xbind-and-inheritance` | UWP, x:Bind, XAML | 4 | 2 | 1 |  | 2 |
| 5 | 2015-12-30 | Disable gestures on Pivot control | `disable-gestures-on-pivot-control` | C#, UWP, XAML | 5 | 3 | 2 |  | 4 |
| 6 | 2016-01-17 | Custom UWP Control: Step-Through ListView | `custom-uwp-control-step-through-listview` | C#, UWP, XAML | 1 |  |  |  | 5 |
| 7 | 2016-02-06 | Displaying PDF files in a UWP app | `displaying-pdf-files-in-a-uwp-app` | C#, UWP, XAML | 1 |  |  |  | 27 |
| 8 | 2016-03-08 | Slidedeck and code “Data sharing and Cross-App communication in UWP” | `slidedeck-and-code-data-sharing-and-cross-app-communication-in-uwp` | C#, Talks, UWP | 1 |  |  |  |  |
| 9 | 2016-06-28 | Getting the user's physical location without location services | `get-users-location-without-location-services` | C#, UWP, Xamarin |  |  |  |  | 1 |
| 10 | 2016-07-05 | Xamarin interview questions | `xamarin-interview-questions` | Xamarin |  |  |  |  | 1 |
| 11 | 2016-09-03 | UWP app on Xbox One: controller input gotcha (KeyDown event) | `uwp-app-on-xbox-one-controller-input-gotcha-keydown-event` | C#, UWP, Xbox One | 2 |  |  | 1 | 1 |
| 12 | 2016-09-19 | UWP Simple PDF viewer | `uwp-simple-pdf-viewer` | C#, UWP, XAML | 1 |  |  |  | 5 |
| 13 | 2016-09-20 | Fix Visual Studio 2015 random crash | `fix-visual-studio-2015-random-crash` | Visual Studio | 1 |  |  | 1 | 1 |
| 14 | 2016-09-26 | How to catch multiple types of exceptions in one catch block | `how-to-catch-multiple-types-of-exceptions-in-one-catch-block` | C# |  |  |  |  | 2 |
| 15 | 2016-10-25 | UWP Custom Control: ExpandableDetailGridView (Google Images Style GridView) | `uwp-custom-control-expandabledetailgridview-google-images-style-gridview` | C#, UWP, XAML | 1 |  |  |  |  |
| 16 | 2016-11-17 | Compiled bindings gotcha - Don't forget INotifyPropertyChanged on your interface | `compiled-bindings-gotcha-dont-forget-inotifypropertychanged-on-your-interface` | C#, UWP, x:Bind, XAML | 1 |  | 1 |  |  |
| 17 | 2016-11-19 | Getting rid of whitespaces between Runs in a TextBlock | `getting-rid-of-whitespaces-between-runs-in-a-textblock` | C#, UWP, XAML | 2 |  |  |  |  |
| 18 | 2017-01-29 | Building a Xamarin app with Azure Functions and OneDrive | `building-a-xamarin-app-with-azure-functions-and-onedrive` | Azure, C#, Function App, MVVM, OneDrive, Xamarin, XamarinAlliance | 9 |  |  |  |  |
| 19 | 2017-02-10 | Custom location and movement on Xamarin Remoted iOS Simulator for Windows | `custom-location-and-movement-on-xamarin-remoted-ios-simulator-for-windows` | AppleScript, Automation, Xamarin | 4 |  |  | 1 | 1 |
| 20 | 2017-04-16 | Setting up a Realm Object Server in Azure and connect to it with Xamarin Forms | `setting-up-a-realm-object-server-in-azure` | Azure, C#, Realm, Xamarin | 3 |  |  | 1 | 1 |
| 21 | 2017-04-20 | Trigger PropertyChanged of indexed property in Xamarin Forms | `trigger-propertychanged-of-indexed-property-in-xamarin-forms` | C#, MVVM, Xamarin, XAML |  |  |  |  | 4 |
| 22 | 2017-05-20 | Dynamically binding RESX Resources in Xamarin Forms | `dynamically-binding-resx-resources-in-xamarin-forms` | C#, Localization, MVVM, UWP, Xamarin, XAML | 1 |  | 1 |  | 21 |
| 23 | 2017-07-06 | Bind to Xamarin Picker but only update value after hitting Done on iOS | `bind-to-xamarin-picker-but-only-update-value-after-hitting-done-on-ios` | C#, Xamarin, XAML |  |  |  |  | 10 |
| 24 | 2017-08-03 | Sharing a Realm via a QR code using ZXing | `sharing-a-realm-via-a-qr-code-using-zxing` | C#, Realm, Xamarin |  |  |  |  | 3 |
| 25 | 2017-08-13 | Creating a 'Continue Watching' experience using Project Rome in UWP | `creating-a-continue-watching-experience-using-project-rome-in-uwp` | C#, UWP | 1 |  |  |  | 1 |
| 26 | 2017-09-02 | Using SqlClient in UWP | `using-sqlclient-in-uwp` | C#, Fall Creators Update, UWP | 1 |  |  |  | 10 |
| 27 | 2017-10-11 | Demos talk "Realm, the cool new kid in Xamarin town" | `demos-talk-realm-the-cool-new-kid-in-xamarin-town` | Azure, C#, Realm, Talks, Xamarin |  |  |  |  |  |
| 28 | 2017-11-05 | Creating a HyperlinkLabel in Xamarin Forms | `creating-a-hyperlinklabel-in-xamarin-forms` | C#, UWP, Xamarin | 1 |  | 1 |  | 7 |
| 29 | 2017-12-02 | Achievement Unlocked: Microsoft MVP | `achievement-unlocked-microsoft-mvp` | Welcome | 2 |  |  |  |  |
| 30 | 2017-12-21 | Using the Fluent Design System in a minesweeper game | `using-the-fluent-design-system-in-a-minesweeper-game` | C#, Fall Creators Update, Fluent Design, UWP, XAML | 2 |  |  |  |  |
| 31 | 2018-02-06 | Multiple instances support for UWP apps | `multiple-instances-support-for-uwp-apps` | RS4, UWP | 1 |  |  |  | 4 |
| 32 | 2018-02-25 | Multiple instances support for UWP apps (Part 2): Redirection | `multiple-instances-support-for-uwp-apps-part-2-redirection` | C#, RS4, UWP | 2 |  |  |  |  |
| 33 | 2018-04-05 | Creating a UWP Console app in C# | `creating-a-uwp-console-app-in-c` | C#, RS4, UWP, Visual Studio | 6 |  |  | 2 | 12 |
| 34 | 2018-05-15 | Image classification with WinML and UWP | `image-classification-with-winml-and-uwp` | AI, C#, Cognitive services, Custom Vision, ML, UWP, Visual Studio | 6 |  |  | 1 | 5 |
| 35 | 2018-06-04 | Image classification with Azure Custom Vision Service and CoreML | `image-classification-with-azure-custom-vision-service-and-coreml` | AI, Azure, C#, Cognitive services, Custom Vision, ML, Xamarin | 3 |  |  |  | 1 |
| 36 | 2018-12-07 | Using Android Linkify to add inline links to a Xamarin Forms Label | `using-android-linkify-to-add-inline-links-to-a-xamarin-forms-label` | Android, C#, Xamarin | 1 |  | 1 |  | 2 |
| 37 | 2018-12-12 | Fixing AppCenter Android Build Error: /usr/bin/jarsigner failed with return code: 1 | `fixing-appcenter-android-build-error-usr-bin-jarsigner-failed-with-return-code-1` | Android, AppCenter, C#, Xamarin | 2 |  |  |  | 5 |
| 38 | 2019-01-01 | Multi targeting, am I falling in love? | `multi-targeting-am-i-falling-in-love` | Android, Architecture, C#, Cross-platform, iOS, UWP, Xamarin | 4 |  | 2 |  | 1 |
| 39 | 2019-03-12 | Get Geo Location in background with Xamarin.Essentials on iOS | `get-geo-location-in-background-with-xamarin-essentials-on-ios` | C#, iOS, Xamarin | 1 |  |  |  | 3 |
| 40 | 2019-04-22 | Image classification with WinML and UWP (update) | `image-classification-with-winml-and-uwp-update` | AI, C#, Custom Vision, ML, UWP, Visual Studio | 1 |  |  |  | 1 |
| 41 | 2019-07-27 | Simple data validation in Xamarin Forms | `simple-data-validation-in-xamarin-forms` | Android, C#, Cross-platform, iOS, UWP, Xamarin, XAML | 4 |  |  |  | 6 |
| 42 | 2019-08-29 | Distributing WPF/WinForms applications using AppCenter and msix | `distributing-wpf-winforms-applications-using-appcenter-and-msix` | AppCenter, UWP, Visual Studio | 4 |  |  |  | 2 |
| 43 | 2019-11-22 | Gotcha: opening default app for file in UWP | `gotcha-opening-default-app-for-file-in-uwp` | C#, UWP |  |  |  |  |  |
| 44 | 2019-12-03 | A fixed and always expanded CommandBar in UWP | `a-fixed-and-always-expanded-commandbar-in-uwp` | C#, UWP, XAML | 2 |  |  |  | 1 |
| 45 | 2020-01-29 | Gotcha! Deploying Azure Notification Hub with ARM Template (APNS Token and Certificate) | `gotcha-deploying-azure-notification-hub-with-arm-template-apns-token-and-certificate` | ARM, Azure, Notification Hubs, PowerShell | 2 |  |  |  |  |
| 46 | 2020-02-15 | Reading Belgian eID in UWP using SmartCardReader | `reading-belgian-eid-in-uwp-using-smartcardreader` | APDU, C#, eID, UWP | 7 |  |  |  | 10 |
| 47 | 2020-11-30 | Accessing UWP APIs from a Win32 application | `accessing-uwp-apis-from-a-win32-application` | C#, UWP, Visual Studio | 1 |  |  | 1 |  |
| 48 | 2020-12-03 | Uploading UWP AppxBundle to App Center in Azure DevOps | `uploading-uwp-appxbundle-to-app-center-in-azure-devops` | AppCenter, Automation, Azure DevOps, UWP | 3 |  |  |  | 3 |
| 49 | 2021-02-03 | UWP randomly throwing System.ExecutionEngineException => a Fix! | `uwp-randomly-throwing-system-executionengineexception-a-fix` | UWP | 1 |  | 1 |  |  |
| 50 | 2021-02-06 | Watch for changes in Blazor WASM to automatically reload your page | `watch-for-changes-in-blazor-wasm-to-automatically-reload-your-page` | Blazor, Visual Studio |  |  |  |  | 1 |
| 51 | 2021-08-19 | Select TextBox content when tab focussed in UWP | `select-textbox-content-when-tab-focussed-in-uwp` | C#, UWP, x:Bind | 2 |  |  |  |  |
| 52 | 2021-09-09 | Multi targeting based on file name in MAUI | `multi-targeting-based-on-file-name-in-maui` | C#, MAUI | 3 |  |  |  | 2 |
| 53 | 2021-09-19 | Fixing build issue in MAUI preview 8 | `fixing-build-issue-in-maui-preview-8` | Android, MAUI, Visual Studio | 2 |  |  |  | 5 |
| 54 | 2021-12-21 | Fixing video file not streaming from Azure Blob Storage on Android | `fixing-video-file-not-streaming-from-azure-blob-storage-on-android` | Android, Azure, C#, Xamarin |  |  |  |  | 2 |
| 55 | 2022-02-11 | Setting up a basic MVVM architecture in .NET MAUI | `setting-up-a-basic-mvvm-architecture-in-net-maui` | C#, MAUI, MVVM, Xamarin | 1 |  |  |  | 6 |
| 56 | 2022-12-13 | Font Awesome Duotone icons in .NET MAUI and Xamarin.Forms | `fontawesome-duotone-icons-in-maui-and-xamarin-forms` | C#, MAUI, Xamarin, XAML | 6 |  |  |  | 8 |
| 57 | 2023-10-03 | Exploring the Whisper model in Azure OpenAI Service | `exploring-whisper-model-in-azure-openai-service` | AI, Azure, C#, OpenAI Services, Python | 3 |  |  |  | 5 |
| 58 | 2023-12-01 | I Wrote a book... | `i-wrote-a-book` | MAUI, MVVM | 1 |  |  |  |  |
| 59 | 2023-12-08 | Translate spoken text using Whisper and GPT with Azure OpenAI Services and .NET MAUI | `translate-spoken-text-with-whisper-and-gpt-with-azure-open-ai-services-and-net-maui` | AI, Azure, C#, MAUI, OpenAI Services | 2 |  |  |  | 1 |
| 60 | 2024-05-02 | Cross-Platform App Development is Dead, Long Live Cross-Platform App Development! | `cross-platform-app-development-is-dead-long-live-cross-platform-app-development` | MAUI, Xamarin | 1 |  |  |  | 1 |
| 61 | 2025-08-14 | Fix Maui Android "Doesn't support required ABI" issue | `fix-maui-android-doesnt-support-required-abi-issue` | Android, MAUI | 3 |  |  |  | 1 |
| 62 | 2026-05-25 | Qwen3.5 in .NET MEAI Hangs Forever And How OllamaSharp Fixes It in One Line | `qwen3-5-in-net-meai-hangs-forever-and-how-ollamasharp-fixes-it-in-one-line` | AI, C#, LLMs, Ollama | 1 |  |  |  | 1 |

### Drafts (not published) – do NOT migrate

| Date | Title | Assets |
|---|---|---|
| 2017-03-01 | Building a Xamarin app with Azure Functions and OneDrive - Part 2 | 4 |
| 2018-02-04 | Playing with Universal Console Apps and Realm | 1 |
| 2018-06-06 | Slides talk Techorama 2018: Help, my Xamarin app has memory issues. |  |
| 2019-11-18 | I finally contributed to Xamarin Forms! |  |
| 2021-04-20 | Select TextBox content on tab focussed |  |

The drafts will not be migrated. Their assets are therefore not included in the asset list below and do not need to be copied.

### Pages

| Page | Status | Slug | Action |
|---|---|---|---|
| About | private | `about` | Migrate → `src/pages/about.astro` (currently private in WP) |
| Home | private | `home` | Skip – placeholder (“Home”) |
| Blog | private | `blog` | Skip – empty placeholder |
| 404 - Page not found | publish | `404-error-content-does-not-exist-anymore` | Migrate as `src/pages/404.astro` (uses `2018/12/image.gif`) |
| Privacy Policy | publish | `privacy-policy` | Migrate (update for new hosting/analytics/ads) |
| Book | publish | `book` | Migrate – body is empty in the export, rebuild content (book: *The MVVM Pattern in .NET MAUI*) |

## 2. Images containing code (conversion review)

Each row is one original image per post. The “displayed as” column lists the resized variant(s) WordPress actually embedded. Only the 🔴 images must be replaced, with fenced code blocks in Markdown. All 11 original conversion candidates were visually inspected on 2026-10-24; seven unannotated images can be converted and four must remain images. The [extracted code report](./IMAGE-CODE-EXTRACTION-REPORT.md) contains the seven transcriptions and the keep-image decisions. Check for equivalent surrounding text or `<pre>` blocks before inserting code to avoid duplication. Never replace an annotated image with code: preserve its lines, arrows, circles and markers.

### 🔴 Code as image → replace with code block

| Post | Image (original) | Displayed as | What it shows |
|---|---|---|---|
| Deferred Loading, mind the Visual State Manager | `2015/11/high-level-small.jpg` | (original) | XAML |
| Deferred Loading, mind the Visual State Manager | `2015/11/vsm-bad.jpg` | (original) | XAML VisualStateManager |
| x:Bind and inheritance | `2015/11/binding.jpg` | (original) | XAML |
| x:Bind and inheritance | `2015/11/new.jpg` | (original) | C# interface |
| Disable gestures on Pivot control | `2015/12/code-header.jpg` | (original) | C# |
| Disable gestures on Pivot control | `2015/12/code-inside1.jpg` | `2015/12/code-inside1-1024x128.jpg` | C# |
| Disable gestures on Pivot control | `2015/12/code-out.jpg` | `2015/12/code-out-1024x128.jpg` | C# |

### 🟠 Code mixed with IDE / debugger / rendered output / annotations → reviewed: keep as image

These were reviewed: the IDE tooling, debugger state, rendered result or annotations are part of the explanation, so they stay as images (no conversion needed).

| Post | Image (original) | Displayed as | What it shows |
|---|---|---|---|
| Deferred Loading, mind the Visual State Manager | `2015/11/collapsed1.jpg` | (original) | VS Live Visual Tree + XAML editor |
| Deferred Loading, mind the Visual State Manager | `2015/11/lazy1.jpg` | (original) | VS Live Visual Tree + XAML editor |
| Deferred Loading, mind the Visual State Manager | `2015/11/result-good.png` | (original) | Live Visual Tree + XAML VisualStateManager |
| x:Bind and inheritance | `2015/11/vs-warning.jpg` | (original) | IDE warning squiggle and tooltip explaining member hiding; tooltip obscures code |
| Disable gestures on Pivot control | `2015/12/xaml-inside.jpg` | `2015/12/xaml-inside-300x129.jpg` | Red underlines highlight PointerEntered and PointerMoved handlers |
| Disable gestures on Pivot control | `2015/12/xaml-out.jpg` | `2015/12/xaml-out-300x114.jpg` | Red underlines highlight PointerExited, PointerReleased and PointerCaptureLost handlers |
| Dynamically binding RESX Resources in Xamarin Forms | `2017/05/Binding-Resources.png` | `2017/05/Binding-Resources-300x189.png` | Red underline, arrow and circle connect the XAML resource key to the C# indexer; labeled ViewModel/Resources diagram |
| Compiled bindings gotcha - Don't forget INotifyPropertyChanged on your interface | `2016/11/propertychangednull.jpg` | `2016/11/propertychangednull-768x477.jpg` | C# in editor while debugging + Watch window |
| Creating a HyperlinkLabel in Xamarin Forms | `2017/11/HyperlinkLabel.jpg` | `2017/11/HyperlinkLabel-768x99.jpg` | XAML snippet + rendered result |
| Using Android Linkify to add inline links to a Xamarin Forms Label | `2017/11/HyperlinkLabel.jpg` | `2017/11/HyperlinkLabel-1024x132.jpg` | XAML snippet + rendered result |
| Multi targeting, am I falling in love? | `2019/01/ezgif-1-f473166e6558.gif` | (original) | animated diagram incl. MSBuild Condition snippet |
| Multi targeting, am I falling in love? | `2019/01/targets.jpg` | (original) | VS target-framework dropdown over C# editor |
| UWP randomly throwing System.ExecutionEngineException => a Fix! | `2021/02/ExecutionEngineException.jpg` | `2021/02/ExecutionEngineException-1024x316.jpg` | C# constructor + Exception Unhandled popup |

### 🟢 Console / terminal output → keep as image

| Post | Image (original) | What it shows |
|---|---|---|
| UWP app on Xbox One: controller input gotcha (KeyDown event) | `2016/09/output.jpg` | VS Output window (debug output) |
| Fix Visual Studio 2015 random crash | `2016/09/VS-SafeMode.jpg` | command prompt |
| Custom location and movement on Xamarin Remoted iOS Simulator for Windows | `2017/02/script-terminal.png` | terminal command |
| Setting up a Realm Object Server in Azure and connect to it with Xamarin Forms | `2017/04/ssh.jpg` | ssh terminal session |
| Creating a UWP Console app in C# | `2018/04/UwpConsole.jpg` | command prompt output |
| Creating a UWP Console app in C# | `2018/04/UwpConsoleNotification-1.gif` | command prompt + notification gif |
| Image classification with WinML and UWP | `2018/05/resultConsole.jpg` | console app output |
| Accessing UWP APIs from a Win32 application | `2020/11/connectedDevice.jpg` | VS Debug Console output |

Not flagged on purpose: `2026/05/llama2.png` (hero illustration with decorative, unreadable code in the background), `2017/02/script-terminal.png` and other terminal shots (console), spec tables from the Belgian eID documentation (`2020/02/*APDU*.jpg`, `Addressfile-contents.jpg`) and UI screenshots of Solution Explorer / designers / portals.

## 3. Assets to migrate, per post

Only the **original** file is needed; WordPress-generated size variants (`-300x200`, `-1024x…`, …) can be regenerated by Astro’s `<Image />`. Where a post only embedded a resized variant, the original is still listed here. Files tagged 📏 should be resized or optimized first (see section 3b).

#### Starting a blog since 2011... (`starting-a-blog-since-2011`)

- `2015/11/blogging-image.jpg` (50 KB) — featured image

#### Deferred Loading, mind the Visual State Manager (`deferred-loading-mind-the-visual-state-manager`)

- `2015/11/collapsed1.jpg` (98 KB) — 🟠 code + UI (reviewed: keep)
- `2015/11/high-level-small.jpg` (22 KB) — 🔴 code
- `2015/11/lazy1.jpg` (95 KB) — 🟠 code + UI (reviewed: keep)
- `2015/11/result-good.png` (133 KB) — 🟠 code + UI (reviewed: keep)
- `2015/11/result1.jpg` (20 KB)
- `2015/11/vsm-bad.jpg` (64 KB) — 🔴 code

#### x:Bind and inheritance (`xbind-and-inheritance`)

- `2015/11/binding.jpg` (20 KB) — 🔴 code
- `2015/11/new.jpg` (29 KB) — 🔴 code
- `2015/11/schema.jpg` (42 KB)
- `2015/11/vs-warning.jpg` (28 KB) — 🟠 code + IDE warning tooltip (reviewed: keep)

#### Disable gestures on Pivot control (`disable-gestures-on-pivot-control`)

- `2015/12/code-header.jpg` (77 KB) — 🔴 code
- `2015/12/code-inside1.jpg` (38 KB) — 🔴 code
- `2015/12/code-out.jpg` (37 KB) — 🔴 code
- `2015/12/xaml-inside.jpg` (68 KB) — 🟠 code + red underlines (reviewed: keep)
- `2015/12/xaml-out.jpg` (63 KB) — 🟠 code + red underlines (reviewed: keep)

#### Custom UWP Control: Step-Through ListView (`custom-uwp-control-step-through-listview`)

- `2016/01/Design.png` (26 KB)

#### Displaying PDF files in a UWP app (`displaying-pdf-files-in-a-uwp-app`)

- `2016/02/pdf-print-screen.png` (243 KB) — 📏 resize/optimize

#### Slidedeck and code “Data sharing and Cross-App communication in UWP” (`slidedeck-and-code-data-sharing-and-cross-app-communication-in-uwp`)

- `2016/03/Data-sharing-and-cross-app-communication.jpg` (56 KB) — featured image

#### UWP app on Xbox One: controller input gotcha (KeyDown event) (`uwp-app-on-xbox-one-controller-input-gotcha-keydown-event`)

- `2016/09/output.jpg` (88 KB) — 🟢 console
- `2016/09/xbox-pointer.jpg` (55 KB)

#### UWP Simple PDF viewer (`uwp-simple-pdf-viewer`)

- `2016/02/pdf-print-screen.png` (243 KB) — 📏 resize/optimize

#### Fix Visual Studio 2015 random crash (`fix-visual-studio-2015-random-crash`)

- `2016/09/VS-SafeMode.jpg` (22 KB) — 🟢 console

#### UWP Custom Control: ExpandableDetailGridView (Google Images Style GridView) (`uwp-custom-control-expandabledetailgridview-google-images-style-gridview`)

- `2016/10/ExpandableDetailGridView.gif` (832 KB) — 📏 resize/optimize

#### Compiled bindings gotcha - Don't forget INotifyPropertyChanged on your interface (`compiled-bindings-gotcha-dont-forget-inotifypropertychanged-on-your-interface`)

- `2016/11/propertychangednull.jpg` (195 KB) — 🟠 code + UI (reviewed: keep)

#### Getting rid of whitespaces between Runs in a TextBlock (`getting-rid-of-whitespaces-between-runs-in-a-textblock`)

- `2016/11/liveproperties.jpg` (104 KB)
- `2016/11/output.jpg` (5 KB)

#### Building a Xamarin app with Azure Functions and OneDrive (`building-a-xamarin-app-with-azure-functions-and-onedrive`)

- `2017/01/Create-new-function-app.jpg` (22 KB)
- `2017/01/Create-new-function-app2.jpg` (46 KB)
- `2017/01/Creating-new-function-app-1.jpg` (55 KB)
- `2017/01/External-file-input.jpg` (33 KB)
- `2017/01/Integrate-1.jpg` (68 KB)
- `2017/01/external-file-connection.jpg` (34 KB)
- `2017/01/overview.png` (50 KB)
- `2017/01/overviewpost1.png` (48 KB)
- `2017/01/solution.jpg` (42 KB)

#### Custom location and movement on Xamarin Remoted iOS Simulator for Windows (`custom-location-and-movement-on-xamarin-remoted-ios-simulator-for-windows`)

- `2017/02/CustomLocation.gif` (967 KB) — 📏 resize/optimize
- `2017/02/LocationSimulator.gif` (781 KB) — 📏 resize/optimize
- `2017/02/errormsg.png` (25 KB)
- `2017/02/script-terminal.png` (45 KB) — 🟢 console

#### Setting up a Realm Object Server in Azure and connect to it with Xamarin Forms (`setting-up-a-realm-object-server-in-azure`)

- `2017/04/LinuxVM.jpg` (45 KB)
- `2017/04/VM-network-Security-Group.jpg` (39 KB)
- `2017/04/ssh.jpg` (43 KB) — 🟢 console

#### Dynamically binding RESX Resources in Xamarin Forms (`dynamically-binding-resx-resources-in-xamarin-forms`)

- `2017/05/Binding-Resources.png` (50 KB) — 🟠 annotated code diagram (reviewed: keep)

#### Creating a 'Continue Watching' experience using Project Rome in UWP (`creating-a-continue-watching-experience-using-project-rome-in-uwp`)

- `2017/08/protocol-declaration.jpg` (58 KB)

#### Using SqlClient in UWP (`using-sqlclient-in-uwp`)

- `2017/09/Version.jpg` (28 KB)

#### Creating a HyperlinkLabel in Xamarin Forms (`creating-a-hyperlinklabel-in-xamarin-forms`)

- `2017/11/HyperlinkLabel.jpg` (44 KB) — 🟠 code + UI (reviewed: keep)

#### Achievement Unlocked: Microsoft MVP (`achievement-unlocked-microsoft-mvp`)

- `2017/12/achievement.jpg` (31 KB)
- `2017/12/mvp.jpg` (60 KB)

#### Using the Fluent Design System in a minesweeper game (`using-the-fluent-design-system-in-a-minesweeper-game`)

- `2017/12/DQ8BMqgWkAERely.mp4` (385 KB) — linked download
- `2017/12/DRAowkoXUAAceUg.mp4` (631 KB) — linked download

#### Multiple instances support for UWP apps (`multiple-instances-support-for-uwp-apps`)

- `2018/02/MultiInstance.gif` (1.2 MB) — 📏 resize/optimize

#### Multiple instances support for UWP apps (Part 2): Redirection (`multiple-instances-support-for-uwp-apps-part-2-redirection`)

- `2018/02/CompileSymbol.jpg` (45 KB)
- `2018/02/MultiInstanceRedirection.gif` (361 KB)

#### Creating a UWP Console app in C# (`creating-a-uwp-console-app-in-c`)

- `2018/02/CompileSymbol.jpg` (45 KB)
- `2018/04/Aliases.jpg` (67 KB)
- `2018/04/UwpConsole.jpg` (37 KB) — 🟢 console
- `2018/04/UwpConsoleNewPrj.jpg` (118 KB)
- `2018/04/UwpConsoleNotification-1.gif` (636 KB) — 🟢 console — 📏 resize/optimize
- `2018/04/UwpConsolePrjStructure.jpg` (53 KB)

#### Image classification with WinML and UWP (`image-classification-with-winml-and-uwp`)

- `2018/05/NewProject.jpg` (61 KB)
- `2018/05/Performance.jpg` (49 KB)
- `2018/05/Tags.jpg` (16 KB)
- `2018/05/result.jpg` (156 KB)
- `2018/05/resultConsole.jpg` (124 KB) — 🟢 console
- `2018/05/wrapperclass.jpg` (82 KB)

#### Image classification with Azure Custom Vision Service and CoreML (`image-classification-with-azure-custom-vision-service-and-coreml`)

- `2018/06/Jun-03-2018-18-12-48.gif` (3.4 MB) — 📏 resize/optimize
- `2018/06/Screen-Shot-2018-06-03-at-16.55.14.png` (42 KB)
- `2018/06/Screen-Shot-2018-06-03-at-17.03.33.png` (37 KB)

#### Using Android Linkify to add inline links to a Xamarin Forms Label (`using-android-linkify-to-add-inline-links-to-a-xamarin-forms-label`)

- `2017/11/HyperlinkLabel.jpg` (44 KB) — 🟠 code + UI (reviewed: keep)

#### Fixing AppCenter Android Build Error: /usr/bin/jarsigner failed with return code: 1 (`fixing-appcenter-android-build-error-usr-bin-jarsigner-failed-with-return-code-1`)

- `2018/12/ReleaseAPK.jpg` (69 KB)
- `2018/12/androidbuild.png` (541 KB) — featured image — 📏 resize/optimize

#### Multi targeting, am I falling in love? (`multi-targeting-am-i-falling-in-love`)

- `2019/01/dependencies.jpg` (87 KB)
- `2019/01/ezgif-1-f473166e6558.gif` (168 KB) — 🟠 code + UI (reviewed: keep)
- `2019/01/targets.jpg` (115 KB) — 🟠 code + UI (reviewed: keep)
- `2019/02/post-1.png` (64 KB) — featured image

#### Get Geo Location in background with Xamarin.Essentials on iOS (`get-geo-location-in-background-with-xamarin-essentials-on-ios`)

- `2019/03/essentialsfb.png` (527 KB) — featured image — 📏 resize/optimize

#### Image classification with WinML and UWP (update) (`image-classification-with-winml-and-uwp-update`)

- `2019/04/onnx.jpg` (47 KB)

#### Simple data validation in Xamarin Forms (`simple-data-validation-in-xamarin-forms`)

- `2019/07/3541.gif` (5 KB)
- `2019/07/uijuly.png` (43 KB)
- `2019/07/validation.gif` (221 KB)
- `2019/07/validationDefault.gif` (166 KB)

#### Distributing WPF/WinForms applications using AppCenter and msix (`distributing-wpf-winforms-applications-using-appcenter-and-msix`)

- `2019/08/addreference.jpg` (10 KB)
- `2019/08/distribute.jpg` (6 KB)
- `2019/08/email.jpg` (28 KB)
- `2019/08/packaging.jpg` (14 KB)

#### A fixed and always expanded CommandBar in UWP (`a-fixed-and-always-expanded-commandbar-in-uwp`)

- `2019/12/appbar1.jpg` (19 KB)
- `2019/12/appbar2.jpg` (19 KB)

#### Gotcha! Deploying Azure Notification Hub with ARM Template (APNS Token and Certificate) (`gotcha-deploying-azure-notification-hub-with-arm-template-apns-token-and-certificate`)

- `2020/01/NotificationHubCertConfig.jpg` (20 KB)
- `2020/01/NotificationHubTokenConfig.jpg` (22 KB)

#### Reading Belgian eID in UWP using SmartCardReader (`reading-belgian-eid-in-uwp-using-smartcardreader`)

- `2020/02/Addressfile-contents.jpg` (136 KB)
- `2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf` (391 KB) — linked download
- `2020/02/ReadAPDU.jpg` (144 KB) — 📏 resize/optimize
- `2020/02/SelectAPDU.jpg` (175 KB) — 📏 resize/optimize
- `2020/02/SelectAPDUResponse.jpg` (228 KB)
- `2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf` (1.8 MB) — linked download
- `2020/02/leIncorrect.jpg` (37 KB)

#### Accessing UWP APIs from a Win32 application (`accessing-uwp-apis-from-a-win32-application`)

- `2020/11/connectedDevice.jpg` (26 KB) — 🟢 console

#### Uploading UWP AppxBundle to App Center in Azure DevOps (`uploading-uwp-appxbundle-to-app-center-in-azure-devops`)

- `2020/12/noreleases.jpg` (49 KB)
- `2020/12/version.jpg` (37 KB) — 📏 resize/optimize
- `2020/12/version2.jpg` (35 KB) — 📏 resize/optimize

#### UWP randomly throwing System.ExecutionEngineException => a Fix! (`uwp-randomly-throwing-system-executionengineexception-a-fix`)

- `2021/02/ExecutionEngineException.jpg` (65 KB) — 🟠 code + UI (reviewed: keep)

#### Select TextBox content when tab focussed in UWP (`select-textbox-content-when-tab-focussed-in-uwp`)

- `2021/08/Tab-regular.gif` (70 KB)
- `2021/08/Tab-select_1.gif` (41 KB)

#### Multi targeting based on file name in MAUI (`multi-targeting-based-on-file-name-in-maui`)

- `2021/09/ProjectStructure.jpg` (48 KB)
- `2021/09/naming.jpg` (16 KB)
- `2021/09/platforms.jpg` (14 KB)

#### Fixing build issue in MAUI preview 8 (`fixing-build-issue-in-maui-preview-8`)

- `2021/09/maui-template.jpg` (23 KB)
- `2021/09/maui-template-new.jpg` (25 KB)

#### Setting up a basic MVVM architecture in .NET MAUI (`setting-up-a-basic-mvvm-architecture-in-net-maui`)

- `2022/02/MauiNavigation.gif` (733 KB) — 📏 resize/optimize

#### Font Awesome Duotone icons in .NET MAUI and Xamarin.Forms (`fontawesome-duotone-icons-in-maui-and-xamarin-forms`)

- `2022/12/AddFont.png` (3 KB)
- `2022/12/DuotoneIcon.png` (1 KB)
- `2022/12/EmbeddedResource.png` (4 KB)
- `2022/12/Icon.png` (1 KB)
- `2022/12/IconLayers.png` (3 KB)
- `2022/12/xmas.png` (24 KB) — featured image

#### Exploring the Whisper model in Azure OpenAI Service (`exploring-whisper-model-in-azure-openai-service`)

- `2023/10/OIG2.jpg` (150 KB) — featured image — 📏 resize/optimize
- `2023/10/openaiservice.jpg` (120 KB)
- `2023/10/whisper.jpg` (92 KB)

#### I Wrote a book... (`i-wrote-a-book`)

- `2023/12/cover_image-scaled.jpg` (392 KB) — featured image — 📏 resize/optimize

#### Translate spoken text using Whisper and GPT with Azure OpenAI Services and .NET MAUI (`translate-spoken-text-with-whisper-and-gpt-with-azure-open-ai-services-and-net-maui`)

- `2023/12/deployGTP35.png` (215 KB) — 📏 resize/optimize
- `2023/12/whisperGTP.png` (2.0 MB) — featured image — 📏 resize/optimize

#### Cross-Platform App Development is Dead, Long Live Cross-Platform App Development! (`cross-platform-app-development-is-dead-long-live-cross-platform-app-development`)

- `2024/05/XamarinMaui.webp` (323 KB) — featured image

#### Fix Maui Android "Doesn't support required ABI" issue (`fix-maui-android-doesnt-support-required-abi-issue`)

- `2025/08/Screenshot-2025-08-14-at-10.45.47.png` (109 KB)
- `2025/08/Screenshot-2025-08-14-at-11.22.49.png` (20 KB)
- `2025/08/Screenshot-2025-08-14-at-11.24.17.png` (15 KB)

#### Qwen3.5 in .NET MEAI Hangs Forever And How OllamaSharp Fixes It in One Line (`qwen3-5-in-net-meai-hangs-forever-and-how-ollamasharp-fixes-it-in-one-line`)

- `2026/05/llama2.png` (1.7 MB) — featured image — 📏 resize/optimize

#### 404 - Page not found (`404-error-content-does-not-exist-anymore`)

- `2018/12/image.gif` (656 KB) — 📏 resize/optimize

### Posts without any local asset

Using Rx in a UWP project with MVVM, Getting the user's physical location without location services, Xamarin interview questions, How to catch multiple types of exceptions in one catch block, Trigger PropertyChanged of indexed property in Xamarin Forms, Bind to Xamarin Picker but only update value after hitting Done on iOS, Sharing a Realm via a QR code using ZXing, Demos talk "Realm, the cool new kid in Xamarin town", Gotcha: opening default app for file in UWP, Watch for changes in Blazor WASM to automatically reload your page, Fixing video file not streaming from Azure Blob Storage on Android

### External image to self-host

- *Cross-Platform App Development is Dead, Long Live Cross-Platform App Development!* embeds `https://pbs.twimg.com/media/GMggKuTWIAA-nhj?format=jpg&name=medium` – download it into the repo.

### Non-image downloads

- `2017/12/DQ8BMqgWkAERely.mp4`, `2017/12/DRAowkoXUAAceUg.mp4` – videos linked from *Using the Fluent Design System in a minesweeper game* (put in `public/`).
- `2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf`, `2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf` – third-party PDFs linked from *Reading Belgian eID…*. Consider linking to the official source instead of re-hosting.

## 3b. 📏 Images to resize / optimize

The new blog's content column is about 720 px wide, so anything wider than **1600 px** (more than 2× for retina) is oversized. Any file over **500 KB** is too heavy for a blog image. In total the 121 images to migrate weigh about 21 MB; the 20 files below account for roughly 18 MB of that.

> Astro's `<Image />` (for images in `src/assets/`) automatically generates resized WebP versions of **still** images, so the 📐 rows are mostly about keeping the repo lean. Animated GIFs are not reliably optimized by Astro (animation can be lost), so convert those yourself.

### 📐 Too large in dimensions (width > 1600 px)

| Image | Size (px) | File size | Used in | Suggestion |
|---|---|---|---|---|
| `2023/12/cover_image-scaled.jpg` | 2076 × 2560 | 392 KB | I Wrote a book... (featured) | Resize to ~800 px wide (book cover); also check `2023/12/cover_image.jpg` isn't needed |
| `2020/12/version2.jpg` | 2211 × 174 | 35 KB | Uploading UWP AppxBundle to App Center in Azure DevOps | Resize to 1440 px wide |
| `2020/12/version.jpg` | 2133 × 198 | 37 KB | Uploading UWP AppxBundle to App Center in Azure DevOps | Resize to 1440 px wide |
| `2023/12/deployGTP35.png` | 2089 × 1288 | 215 KB | Translate spoken text using Whisper and GPT… | Resize to 1440 px wide |
| `2023/10/OIG2.jpg` | 2048 × 1024 | 150 KB | Exploring the Whisper model in Azure OpenAI Service (featured) | Resize to 1440 px wide |
| `2020/02/ReadAPDU.jpg` | 1767 × 635 | 144 KB | Reading Belgian eID in UWP using SmartCardReader | Resize to 1440 px wide (or convert the spec table to a Markdown table) |
| `2016/02/pdf-print-screen.png` | 1703 × 1477 | 243 KB | Displaying PDF files in a UWP app; UWP Simple PDF viewer | Resize to 1440 px wide, convert to JPG/WebP |
| `2020/02/SelectAPDU.jpg` | 1684 × 752 | 175 KB | Reading Belgian eID in UWP using SmartCardReader | Resize to 1440 px wide (or convert the spec table to a Markdown table) |

### ⚖️ Too heavy – still images (> 500 KB)

| Image | Size (px) | File size | Used in | Suggestion |
|---|---|---|---|---|
| `2023/12/whisperGTP.png` | 1024 × 1024 | 2.0 MB | Translate spoken text using Whisper and GPT… (featured) | Illustration saved as PNG → convert to JPG/WebP (~150 KB) |
| `2026/05/llama2.png` | 1536 × 1024 | 1.7 MB | Qwen3.5 in .NET MEAI Hangs Forever… (featured) | Convert to JPG/WebP |
| `2018/12/androidbuild.png` | 830 × 639 | 541 KB | Fixing AppCenter Android Build Error… (featured) | Convert to JPG/WebP |
| `2019/03/essentialsfb.png` | 1200 × 630 | 527 KB | Get Geo Location in background with Xamarin.Essentials on iOS (featured) | Convert to JPG/WebP |

### 🎞️ Too heavy – animated GIFs (> 500 KB)

Convert these to a short MP4/WebM (`<video autoplay loop muted playsinline>`) or animated WebP; that's typically 5–10× smaller.

| Image | Size (px) | File size | Used in |
|---|---|---|---|
| `2018/06/Jun-03-2018-18-12-48.gif` | 320 × 625 | 3.4 MB | Image classification with Azure Custom Vision Service and CoreML |
| `2018/02/MultiInstance.gif` | 680 × 652 | 1.2 MB | Multiple instances support for UWP apps |
| `2017/02/CustomLocation.gif` | 270 × 197 | 967 KB | Custom location and movement on Xamarin Remoted iOS Simulator for Windows |
| `2016/10/ExpandableDetailGridView.gif` | 1452 × 1550 | 832 KB | UWP Custom Control: ExpandableDetailGridView (also oversized: scale to ~600 px wide) |
| `2017/02/LocationSimulator.gif` | 263 × 591 | 781 KB | Custom location and movement on Xamarin Remoted iOS Simulator for Windows |
| `2022/02/MauiNavigation.gif` | 834 × 1304 | 733 KB | Setting up a basic MVVM architecture in .NET MAUI (scale down too; it's shown at 192 px wide) |
| `2018/12/image.gif` | 400 × 300 | 656 KB | 404 page |
| `2018/04/UwpConsoleNotification-1.gif` | 1134 × 860 | 636 KB | Creating a UWP Console app in C# (🟢 console, keep as image/video) |

Borderline (not listed above, but worth a look): `2020/02/Addressfile-contents.jpg` (1577 px wide), `2025/08/Screenshot-2025-08-14-at-10.45.47.png` (1548 px), `2020/02/SelectAPDUResponse.jpg` (1470 px), `2018/02/MultiInstanceRedirection.gif` (361 KB), `2024/05/XamarinMaui.webp` (323 KB).

## 4. Content conversion notes

- **Code blocks**: two highlighter formats are mixed in the HTML – Crayon (`<pre class="lang:c# …">`, ~170 blocks) and Enlighter (`<pre class="EnlighterJSRAW" data-enlighter-language="csharp">`, ~108 blocks), plus a few Gutenberg `wp:code` blocks. Languages used: C#, XAML/XML, PowerShell, YAML, sh, AppleScript, VB.NET, JavaScript, Python, JSON. Map them to fenced blocks (` ```csharp `, ` ```xml `, …) for Astro’s Shiki highlighter.
- **Shortcodes**: `[caption]` (convert to Markdown image + caption/`<figure>`), `[video]` (minesweeper post). Many other `[...]` matches are just C# attributes/indexers inside code (e.g. `[CallerMemberName]`) – don’t strip those.
- **Embeds**: tweets (`twitter.com/dotMorten/status/1356839169826279425`, `twitter.com/jfversluis/status/1432307481628315649`), a Channel 9 video (`channel9.msdn.com/…/Kevin-Gallo-February-2018`, Channel 9 is retired – link to archive or remove).
- **Internal links**: 18 absolute links to `http(s)://blog.pieeatingninjas.be/YYYY/MM/DD/slug/` – rewrite to the new relative URLs.
- **Image URLs**: both `http://` and `https://blog.pieeatingninjas.be/wp-content/uploads/…` are used – rewrite to local imports.
- **Comments**: 196 approved comments exist in the export (most on *Displaying PDF files in a UWP app*: 27). Astro has no built-in comments – decide whether to archive them statically, migrate to Giscus/utterances, or drop them.

## 5. Site-level items

| Item | Location | Action |
|---|---|---|
| `ads.txt` (Google AdSense publisher line) | `_migration/ads.txt` | Migrate to `public/ads.txt` **only** if you keep AdSense |
| Google Search Console verification | `_migration/google529acda37f6f14c2.html`, `blog/google529acda37f6f14c2.html` | Migrate to `public/` (or verify via DNS) |
| Root redirect `index.html` → `http://blog.pieeatingninjas.be/` | `_migration/index.html` | Not needed in Astro; handle at DNS/hosting level |
| Site logo / header / avatar candidates (not referenced in posts) | `2018/12/Blog-logo.png`, `2018/12/cropped-coding.jpg`, `2023/10/IMG_1973.jpg`, `2023/10/cropped-IMG_1973-scaled-1.jpg`, `2023/10/New-banner-1024x200-1.png`, `2016/01/Ninja_Pie_500.png` | Review – likely theme branding / site icon; reuse for the new header/favicon |
| Author photos used in older sidebar/about | `2015/11/foto-pini.jpg`, `2016/01/foto-Pini-small.jpg`, `2016/03/Pini-small.jpg`, `2018/03/Pieter20Nijs-small.jpg` | Review for the About page |
| 301 redirects (plugin *eps-301-redirects*) | stored in the database, not in the export | Check the WP admin / DB backup and recreate as Astro `redirects` |
| SEO metadata (plugin *wp-meta-seo*) | postmeta, not converted | Optionally copy meta descriptions into front-matter `description` |
| Theme custom CSS (Baskerville) | `custom_css` item in export (empty) | Nothing to migrate |

## 6. Do NOT migrate

| Path | Files | Size | Reason |
|---|---|---|---|
| `blog/*.php` (`index.php`, `wp-*.php`, `xmlrpc.php`; excl. `wp-config*.php`) | 13 | – | WordPress core entry points |
| `blog/wp-config.php` | 1 | – | ⚠️ Contains **database credentials and auth salts** – never commit; rotate the DB password when the old site is shut down |
| `blog/wp-config-sample.php`, `blog/license.txt`, `blog/readme.html` | 3 | – | WordPress boilerplate |
| `blog/wp-admin/` | 576 | 9.9 MB | WordPress core |
| `blog/wp-includes/` | 2038 | 50 MB | WordPress core |
| `blog/wp-content/plugins/` | 9120 | 138 MB | PHP plugins (Akismet, Jetpack, Crayon, Enlighter, UpdraftPlus, AdSense, …) – replaced by Astro features |
| `blog/wp-content/themes/` | 240 | 5.8 MB | Baskerville PHP theme + translation files |
| `blog/wp-content/languages/` | 1613 | 80 MB | WordPress translations |
| `blog/wp-content/updraft/` | 8 | 103 MB | UpdraftPlus backups (2022-02-12) – ⚠️ contain a **full DB dump** (users, emails, password hashes); keep offline as archive, never commit |
| `blog/wp-content/index.php`, `uploads/**/index.php` | – | – | “Silence is golden” stubs |
| `_migration/.htaccess` | 1 | – | Apache rules for the old host |
| 5 draft posts (see section 1) | – | – | Decided: drafts are not migrated |
| **All `.php` files in total** | **5870** | | |

### Uploads that are not needed

- **424 WordPress size variants** of used images (`*-150x150.*`, `*-300x…`, `*-768x…`, `*-1024x…`, …) – regenerate with Astro instead.
- **74 originals (plus their size variants) not referenced by any post or page** in the export – e.g. 2015 Rx/MVVM screenshots (that post now uses `<pre>` code blocks), social-media share images (`*_FB.jpg`, `*_TW.jpg`, `postfb.jpg`, `posttwit.jpg`) and `PR5108-*` before/after screenshots (unattached; possibly meant for the draft *I finally contributed to Xamarin Forms!*). Skip unless listed in section 5:

  - `2015/11/collapsed.jpg`
  - `2015/11/final-result.jpg`
  - `2015/11/final-result1.jpg`
  - `2015/11/final-result2.jpg`
  - `2015/11/final-result3.jpg`
  - `2015/11/foto-pini.jpg`
  - `2015/11/funny-new-years-resolutions.jpg`
  - `2015/11/initial-rx.jpg`
  - `2015/11/lazy.jpg`
  - `2015/11/result-qry.jpg`
  - `2015/11/result.jpg`
  - `2015/11/result11.jpg`
  - `2015/11/rx-first-attempt.jpg`
  - `2015/11/rx-vm-1.jpg`
  - `2015/11/rxextensionmethod.jpg`
  - `2015/11/rxextensionmethod1.jpg`
  - `2015/11/rxmvvm1.jpg`
  - `2015/11/search-observable.jpg`
  - `2015/11/subscribe1.jpg`
  - `2015/11/subscribe11.jpg`
  - `2015/11/ugly-code.jpg`
  - `2015/11/ugly-code1.jpg`
  - `2015/11/usage.jpg`
  - `2016/01/Ninja_Pie_500.png`
  - `2016/01/email.jpg`
  - `2016/01/foto-Pini-small.jpg`
  - `2016/03/Pini-small.jpg`
  - `2016/03/meet-banner-website-e1457452466550.png`
  - `2016/03/meet-banner-website.png`
  - `2016/10/GameBotDemo.gif`
  - `2017/01/Default-code.jpg`
  - `2017/01/Integrate.jpg`
  - `2017/02/Xamarin-Ceritified-Mobile-Developer-Badge-small-res.png`
  - `2017/04/VM-network-interface.jpg`
  - `2017/07/790012.png`
  - `2017/08/RealmLogo.jpg`
  - `2017/09/Xamarin-Ceritified-Mobile-Developer-Badge-small-res.png`
  - `2017/12/Screenshot1.jpg`
  - `2017/12/Screenshot2.png`
  - `2017/12/mvp-logo.png`
  - `2018/03/Pieter20Nijs-small.jpg`
  - `2018/05/spelling-e1525971191757.jpg`
  - `2018/05/spelling.jpg`
  - `2018/06/Screen-Shot-2018-06-03-at-18.23.29.png`
  - `2018/12/AndroidBuild_FB.jpg`
  - `2018/12/AndroidBuild_TW.jpg`
  - `2018/12/Blog-logo.png`
  - `2018/12/cropped-coding.jpg`
  - `2018/12/cropped-dscn6067.jpg`
  - `2018/12/dscn6067.jpg`
  - `2019/02/Bull-ITsmall.jpg`
  - `2019/02/postfb.jpg`
  - `2019/02/posttwit.jpg`
  - `2019/03/essentialstw.png`
  - `2019/07/Picture2-128.png`
  - `2019/09/PR5108-hotpink-after.jpg`
  - `2019/09/PR5108-hotpink-before.jpg`
  - `2019/09/PR5108-trans-after.jpg`
  - `2019/09/PR5108-trans-before.jpg`
  - `2020/02/eIdLogo.png`
  - `2020/02/eIdNugetLogo.png`
  - `2021/01/scroll.html`
  - `2021/01/scroll2.html`
  - `2021/01/scroll3.html`
  - `2023/10/IMG_1973-scaled.jpg`
  - `2023/10/IMG_1973.jpg`
  - `2023/10/New-banner-1024x200-1.png`
  - `2023/10/cropped-IMG_1973-scaled-1.jpg`
  - `2023/11/output-4.mp4`
  - `2023/12/Screenshot-2023-12-01-150929.png`
  - `2023/12/cover_image.jpg`
  - `2024/02/image.png`
  - `2024/03/3329-0o0o0-GjuHGmwxyVn9Vnp67JK791.jpg`
  - `2024/05/Xamarin-RIP.webp`

## 7. Suggested migration checklist

- [ ] Create one Markdown/MDX file per **published** post (skip the 5 drafts) in `src/content/blog/` (title, `pubDate`, slug, tags from categories, `heroImage` from the featured image).
- [ ] Copy only the originals listed in section 3 next to each post (or into `src/assets/blog/<slug>/`).
- [ ] Replace every 🔴 image with a fenced code block (🟠 images were reviewed and stay as images).
- [ ] Keep 🟢 console screenshots as images.
- [ ] Resize / recompress the 📏 images from section 3b (and convert large GIFs to video).
- [ ] Convert Crayon/Enlighter `<pre>` blocks and `[caption]`/`[video]` shortcodes.
- [ ] Rewrite internal links and image URLs; preserve `/YYYY/MM/DD/slug/` URLs or add redirects.
- [ ] Migrate About, Book, Privacy Policy and 404 pages.
- [ ] Decide on comments, AdSense (`ads.txt`) and Search Console verification.
- [ ] Archive `wp-config.php` and `updraft/` backups securely outside the repo.
