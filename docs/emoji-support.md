# Emoji Support

The web client includes native emoji support that automatically converts text emoticons (like `:)` and `:D`) into graphical Unicode emoji characters. This feature enhances communication by making messages more expressive and visually appealing.

## Overview

When enabled, the emoji system converts text emoticons in:

- **Terminal output** - All game output displayed in the main terminal
- **Communications panel** - Say, tell, and channel messages

The conversion happens client-side after HTML escaping, ensuring security while supporting emoticons that contain special characters (like `<3` for hearts).

## Supported Emoticons

The system supports 50+ common emoticons:

### Basic Smileys

| Emoticon | Emoji | Description |
|----------|-------|-------------|
| `:)` `:-)` `:]` | 😊 | Smiling face |
| `:D` `:-D` | 😃 | Grinning face |
| `:(` `:-(` `:[` | 😢 | Sad face |
| `:'(` | 😭 | Crying face |
| `:P` `:-P` `:p` `:-p` | 😛 | Tongue out |
| `;)` `;-)` | 😉 | Winking face |
| `:O` `:-O` `:o` `:-o` | 😮 | Surprised face |
| `:/` `:-/` `:\` `:-\` | 😕 | Confused face |
| `:*` `:-*` | 😘 | Kissing face |
| `D:` | 😧 | Anguished face |
| `:S` `:-S` `:s` | 😖 | Confounded face |

### Expressive Faces

| Emoticon | Emoji | Description |
|----------|-------|-------------|
| `XD` `xD` | 😆 | Laughing face |
| `B)` `B-)` `8)` `8-)` | 😎 | Cool face with sunglasses |
| `>:(` | 😠 | Angry face |
| `>:)` | 😈 | Smiling devil |
| `O:)` `0:)` | 😇 | Angel face |
| `-_-` | 😑 | Expressionless face |
| `^_^` `^.^` | 😊 | Happy face |
| `T_T` `T.T` | 😭 | Crying face |
| `o_o` `O_O` | 😳 | Flushed/shocked face |
| `:3` | 😺 | Cat face |

### Symbols

| Emoticon | Emoji | Description |
|----------|-------|-------------|
| `<3` | ❤️ | Heart |
| `</3` | 💔 | Broken heart |

### Alternative Styles

| Emoticon | Emoji | Description |
|----------|-------|-------------|
| `=)` | 😊 | Smiling face |
| `=D` | 😃 | Grinning face |
| `=(` | 😢 | Sad face |
| `=P` `=p` | 😛 | Tongue out |
| `;P` `;p` | 😜 | Winking tongue |
| `:$` `:-$` | 😳 | Embarrassed |
| `:X` `:-X` `:x` | 🤐 | Zipper mouth |
| `:@` `:-@` | 😡 | Angry/enraged |
| `:>` `:->` | 😊 | Smiling face |

## Configuration

### Checking Status

The emoji feature is **enabled by default**. You can check the current setting in your browser's developer console:

```javascript
localStorage.getItem('mudforge-emoji-enabled');
// Returns: 'true', 'false', or null (defaults to enabled)
```

### Disabling Emoji Conversion

To disable emoji conversion:

```javascript
localStorage.setItem('mudforge-emoji-enabled', 'false');
```

Then refresh the page for the change to take effect.

### Re-enabling Emoji Conversion

To re-enable emoji conversion:

```javascript
localStorage.setItem('mudforge-emoji-enabled', 'true');
```

Or simply remove the setting to use the default (enabled):

```javascript
localStorage.removeItem('mudforge-emoji-enabled');
```

## Technical Details

### Architecture

The emoji system consists of three components:

1. **`src/client/emoji-converter.ts`** - Core conversion utility
   - Defines the emoticon-to-emoji mapping
   - Builds optimized regex pattern for matching
   - Exports `convertEmoticons()`, `isEmojiConversionEnabled()`, and `setEmojiConversionEnabled()`

2. **`src/client/terminal.ts`** - Terminal integration
   - Applies emoji conversion in `parseAnsi()` method
   - Runs after ANSI color parsing

3. **`src/client/comm-panel.ts`** - Communications panel integration
   - Uses `formatContent()` helper for message content
   - Applies to say, tell, and channel messages

### Processing Order

The conversion follows a specific order to ensure security:

1. **HTML Escaping** - Special characters are escaped first (`<` becomes `&lt;`)
2. **ANSI Parsing** - Color codes are converted to CSS classes (terminal only)
3. **Emoji Conversion** - Emoticons are converted to Unicode emoji

This order is critical because:
- Emoticons like `<3` contain HTML-sensitive characters
- After escaping, `<3` becomes `&lt;3`
- The emoji map includes both forms: `<3` and `&lt;3`

### Word Boundary Matching

The regex pattern uses lookbehind and lookahead assertions to ensure emoticons are standalone:

```
(?<=^|\s|>)(emoticons)(?=$|\s|<)
```

This prevents false positives like:
- `:password` - The `:p` is not converted because it's followed by letters
- `url:)more` - The `:)` is not converted because it's surrounded by letters
- `file://path` - The `:/` is not converted

Valid conversions:
- `:) hello` - At start of text
- `hello :)` - At end of text
- `hello :) world` - Between spaces
- `<span>:)</span>` - Between HTML tags

### Pattern Priority

Longer emoticons are matched first to ensure the most specific match wins:

- `:-)`  is checked before `:)`
- `:-D` is checked before `:D`
- `&gt;:(` is checked before `>:(`

### Performance

The regex pattern is built once at module load time and reused for all conversions. The pattern:
- Sorts emoticons by length (longest first)
- Escapes regex special characters
- Combines all emoticons into a single alternation pattern

## Examples

### In-Game Usage

```
> say Hello everyone :) How are you today?
You say: Hello everyone 😊 How are you today?

> say I <3 this game!
You say: I ❤️ this game!

> ooc Anyone want to group? :D
[OOC] Player: Anyone want to group? 😃

> tell friend Thanks for the help ;)
You tell friend: Thanks for the help 😉
```

### Edge Cases

```
> say Check out https://example.com:/path
You say: Check out https://example.com:/path
(No conversion - :/ is part of URL)

> say My password is :password123
You say: My password is :password123
(No conversion - :p is not standalone)

> say :) :D :P
You say: 😊 😃 😛
(All three converted - each is standalone)
```

## Troubleshooting

### Emojis Not Appearing

1. **Check if disabled** - Run `localStorage.getItem('mudforge-emoji-enabled')` in console
2. **Clear cache** - Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. **Check browser support** - Ensure your browser supports Unicode emoji

### Wrong Emoji Displayed

The system uses Unicode emoji characters, which may render differently across:
- Operating systems (Windows, macOS, Linux)
- Browsers (Chrome, Firefox, Safari)
- Font settings

This is expected behavior as emoji rendering is platform-dependent.

### Emoticon Not Converting

Check that the emoticon:
1. Is in the supported list above
2. Has a space or line boundary before and after it
3. Is not part of a URL or other text

## Future Enhancements

Potential improvements that could be added:

- **Settings UI** - Toggle in client preferences modal
- **Custom emoticons** - User-defined emoticon mappings
- **Shortcode support** - Discord/Slack style `:smile:` codes
- **Emoji picker** - Click-to-insert emoji panel
- **Server-side config** - Global enable/disable setting
