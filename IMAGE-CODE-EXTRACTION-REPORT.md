# Code image extraction report

Reviewed on 2026-10-24 against the original files under the gitignored
`_migration/blog/wp-content/uploads/`. Image paths below are relative to that
uploads directory. No source images or raw migration data are copied into this report.

Scope: the 11 images originally listed for conversion in
[MIGRATION-REPORT.md](./MIGRATION-REPORT.md#2-images-containing-code-conversion-review).
Each original was visually checked for annotations before transcription.
Seven images are eligible for code replacement; four must remain images.
This report does not migrate posts or replace images yet.

## Review decisions

| Image | Decision | Visual review |
|---|---|---|
| `2015/11/high-level-small.jpg` | Convert to code | XAML only; no annotations |
| `2015/11/vsm-bad.jpg` | Convert to code | XAML only; no annotations |
| `2015/11/binding.jpg` | Convert to code | XAML only; no annotations |
| `2015/11/new.jpg` | Convert to code | C# with CodeLens reference counts; no explanatory annotations |
| `2015/11/vs-warning.jpg` | **Keep original image** | IDE warning squiggle and member-hiding tooltip are meaningful; tooltip obscures code |
| `2015/12/code-header.jpg` | Convert to code | C# only; no annotations |
| `2015/12/code-inside1.jpg` | Convert to code | C# only; no annotations |
| `2015/12/code-out.jpg` | Convert to code | C# only; no annotations |
| `2015/12/xaml-inside.jpg` | **Keep original image** | Red underlines emphasize the PointerEntered and PointerMoved handlers |
| `2015/12/xaml-out.jpg` | **Keep original image** | Red underlines emphasize the PointerExited, PointerReleased and PointerCaptureLost handlers |
| `2017/05/Binding-Resources.png` | **Keep original image** | Red underline, curved arrow and circle explain the resource-key/indexer relationship; ViewModel/Resources boxes are part of the diagram |

Do not replace the four retained images with code-only versions: that would lose
the explanation or warning state. The tooltip screenshot is retained even though
its warning indicator is IDE-generated rather than a hand-drawn annotation.

## Extracted code

Transcribed from the visible originals and checked against them. Indentation is
normalized; code, identifiers, comments and values are otherwise preserved.
CodeLens reference counts are editor UI, not C#, and are omitted. These are
historical snippets, not standalone compilable examples; do not modernize or fix
them during migration. Check the surrounding post for existing equivalent code
before inserting a replacement.

### `2015/11/high-level-small.jpg`

Post: **Deferred Loading, mind the Visual State Manager**

```xml
<Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <Grid x:Name="narrowView" x:DeferLoadStrategy="Lazy" Visibility="Collapsed" />
    <Grid x:Name="wideView" x:DeferLoadStrategy="Lazy" Visibility="Collapsed" />
</Grid>
```

### `2015/11/vsm-bad.jpg`

Post: **Deferred Loading, mind the Visual State Manager**

```xml
<VisualStateManager.VisualStateGroups>
    <VisualStateGroup >
        <VisualState x:Name="narrow">
            <VisualState.StateTriggers>
                <AdaptiveTrigger MinWindowWidth="0" />
            </VisualState.StateTriggers>
            <VisualState.Setters>
                <Setter Target="narrowView.Visibility" Value="Visible" />
                <Setter Target="wideView.Visibility" Value="Collapsed" />
            </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="wide">
            <VisualState.StateTriggers>
                <AdaptiveTrigger MinWindowWidth="480" />
            </VisualState.StateTriggers>
            <VisualState.Setters>
                <Setter Target="wideView.Visibility" Value="Visible" />
                <Setter Target="narrowView.Visibility" Value="Collapsed" />
            </VisualState.Setters>
        </VisualState>
    </VisualStateGroup>
</VisualStateManager.VisualStateGroups>
```

### `2015/11/binding.jpg`

Post: **x:Bind and inheritance**

```xml
<StackPanel Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}" />
    <Button Content="Click me" Tapped="{x:Bind ViewModel.OnMainButtonClick}" />
</StackPanel>
```

### `2015/11/new.jpg`

Post: **x:Bind and inheritance**

```csharp
public interface IMainPageViewModel : IViewModel
{
    //uncommenting this will let the compile binding work
    new string Title { get; }
    void OnMainButtonClick();
}
```

### `2015/12/code-header.jpg`

Post: **Disable gestures on Pivot control**

```csharp
private void ScrollViewer_PointerInside(object sender, PointerRoutedEventArgs e)
{
    if (e.GetCurrentPoint((ScrollViewer)sender).Position.Y > 48)
    {
        ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Disabled;
    }
    else
    {
        ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Enabled;
    }
}
```

### `2015/12/code-inside1.jpg`

Post: **Disable gestures on Pivot control**

```csharp
private void ScrollViewer_PointerInside(object sender, PointerRoutedEventArgs e)
{
    ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Disabled;
}
```

### `2015/12/code-out.jpg`

Post: **Disable gestures on Pivot control**

```csharp
private void ScrollViewer_PointerOut(object sender, PointerRoutedEventArgs e)
{
    ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Enabled;
}
```

## Validation and boundaries

- All 11 original conversion candidates were available and visually inspected.
- Seven code blocks were checked against their originals: three XML/XAML and four C#.
- All three images with red annotations are retained, along with the IDE warning screenshot.
- The migration report's summary, per-post counts, conversion tables and asset
  inventory reflect these decisions. Its keep-image total counts unique files,
  not repeated uses across posts.
- No unreadable code in the seven eligible images required guessing. The obscured
  warning screenshot was not reconstructed.
- The report contains only image names, public post titles, review decisions and
  transcribed code; no private identities or raw export metadata.
- No application code, public assets or post content changed. No application build
  is needed for this documentation-only extraction. The next migration phase has
  not been started.
