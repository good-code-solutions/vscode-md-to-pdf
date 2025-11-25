# MD to PDF - Feature Showcase

Welcome to the **MD to PDF** extension! This document demonstrates the supported features.

## 1. Syntax Highlighting
We support syntax highlighting for major languages.

### JavaScript
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
greet('World');
```

### Python
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

### Rust
```rust
fn main() {
    println!("Hello, world!");
}
```

## 2. Task Lists
Keep track of your projects with GitHub-style task lists.

- [x] Create project plan
- [x] Implement core features
- [ ] Write documentation
- [ ] Publish to marketplace

## 3. Tables
Organize data cleanly.

| Feature | Status | Priority |
| :--- | :---: | ---: |
| PDF Export | ✅ Ready | High |
| Highlighting | ✅ Ready | Medium |
| Custom CSS | 🚧 WIP | Low |

## 4. Blockquotes & Formatting
> "The best way to predict the future is to invent it."
> — Alan Kay

**Bold text**, *Italic text*, and `inline code` are all supported.

## 5. Architecture Diagrams (ASCII)
Visualize your system design directly in Markdown.

### Client-Server Architecture
```
+--------+       +--------+       +--------+
|        |       |        |       |        |
| Client | <---> | Server | <---> |   DB   |
|        |       |        |       |        |
+--------+       +--------+       +--------+
```

### Microservices Flow
```
      +-> Service A
      |
LB ---+-> Service B
      |
      +-> Service C ---+
                       |
                       v
                  +----------+
                  | Database |
                  +----------+
```

## 6. Mathematical Formulas (if supported)
$E = mc^2$

---
*Generated with MD to PDF Extension*
