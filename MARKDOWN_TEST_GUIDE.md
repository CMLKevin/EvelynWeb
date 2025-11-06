# 📝 Markdown Testing Guide

## Quick Test Messages

Copy and paste these into the chat to test markdown rendering:

### Test 1: Basic Formatting
```
Hey Evelyn! Can you explain this?

Here's what **markdown** can do:
- *Italic text*
- **Bold text**
- ~~Strikethrough~~
- `inline code`

Pretty cool, right?
```

### Test 2: Code Block
```
Can you show me a Python function?

Sure! Here's an example:

```python
def fibonacci(n):
    """Calculate fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test it
print(fibonacci(10))
```
```

### Test 3: Lists
```
What are the main features?

Here are the key features:

1. **Smart Truncation**
   - AI-powered importance scoring
   - Pre-truncation memory storage
   - 60/40 hybrid preservation

2. **Enhanced Search**
   - Query refinement
   - Beautiful result bubbles
   - Citation support

3. **Markdown Support**
   - Full formatting
   - Syntax highlighting
   - Tables and more
```

### Test 4: Links
```
Check out these resources:
- [OpenAI](https://openai.com)
- [React Docs](https://react.dev)
- [Markdown Guide](https://markdownguide.org)
```

### Test 5: Table
```
Here's a comparison:

| Feature | Before | After |
|---------|--------|-------|
| Formatting | Plain | Rich |
| Code | No highlight | Highlighted |
| Links | Raw | Clickable |
```

### Test 6: Blockquote
```
As someone once said:

> "The best way to predict the future
> is to invent it."
> — Alan Kay
```

### Test 7: Mixed Content
```
Let me break this down:

# Main Topic

## Subtopic 1

Here's a **key point** with some `code`:

```javascript
const result = data.map(x => x * 2);
```

And here's a list:
1. First item
2. Second item
3. Third item

Check [this link](https://example.com) for more!
```

## What to Look For

✅ **Formatting**: Bold, italic, strikethrough render correctly  
✅ **Code**: Syntax highlighting with dark theme  
✅ **Lists**: Proper bullets and numbering  
✅ **Links**: Purple color, clickable, opens in new tab  
✅ **Tables**: Proper grid layout with headers  
✅ **Headers**: Different sizes, proper hierarchy  
✅ **Performance**: Smooth rendering, no lag  
✅ **Mobile**: Works on mobile browsers  

## Expected Behavior

- **Evelyn's messages**: Full markdown rendering
- **Your messages**: Plain text (no markdown)
- **Search results**: Markdown in synthesis and answer
- **Streaming**: Markdown renders as tokens arrive
- **Code blocks**: Dark theme, language label, copy-friendly

## Status Indicator

If you see:
- Beautiful formatted text → ✅ Working!
- Syntax highlighting → ✅ Working!
- Clickable links → ✅ Working!
- Raw markdown symbols → ❌ Not working (restart server)

