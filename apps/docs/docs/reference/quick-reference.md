---
sidebar_position: 1
title: Quick Reference
---

# Prism Quick Reference

A comprehensive cheat sheet for the Prism programming language.

## Keywords

### Declarations
| Keyword | Description | Example |
|---------|-------------|---------|
| `let` | Mutable variable | `let count = 0` |
| `const` | Immutable binding | `const PI = 3.14` |
| `function` | Function declaration | `function add(a, b) { return a + b }` |
| `async` | Async function | `async function fetch() { ... }` |
| `import` | Import module | `import {sum} from "./math.prism"` |
| `export` | Export value | `export const VERSION = "1.0"` |
| `from` | Import source | `import {x} from "./module.prism"` |
| `as` | Import alias | `import {x as y} from "./m.prism"` |

### Control Flow
| Keyword | Description | Example |
|---------|-------------|---------|
| `if` / `else` | Conditional | `if x > 0 { ... } else { ... }` |
| `for` | For loop | `for i = 0; i < 10; i++ { ... }` |
| `for...in` | Iterate array | `for item in array { ... }` |
| `while` | While loop | `while condition { ... }` |
| `do...while` | Do-while loop | `do { ... } while condition` |
| `break` | Exit loop | `break` |
| `continue` | Next iteration | `continue` |
| `return` | Return value | `return result` |
| `try` | Try block | `try { ... } catch (e) { ... }` |
| `catch` | Catch errors | `catch (error) { ... }` |
| `finally` | Always execute | `finally { cleanup() }` |
| `await` | Await promise | `result = await fetchData()` |

### Uncertainty
| Keyword | Description | Example |
|---------|-------------|---------|
| `uncertain` | Confidence-based control | `uncertain if (value) { ... }` |
| `high` | Confidence ≥ 0.7 | `high { handleConfident() }` |
| `medium` | 0.5 ≤ confidence &lt; 0.7 | `medium { needsReview() }` |
| `low` | Confidence &lt; 0.5 | `low { reject() }` |
| `default` | Fallback branch | `default { handleUnknown() }` |
| `context` | Context block | `context analysis { ... }` |
| `Agent` | Agent declaration | `Agent Assistant { ... }` |

### Literals
| Keyword | Description | Example |
|---------|-------------|---------|
| `true` | Boolean true | `isValid = true` |
| `false` | Boolean false | `isValid = false` |
| `null` | Null value | `data = null` |
| `undefined` | Undefined value | `value = undefined` |

### Type Checking
| Keyword | Description | Example |
|---------|-------------|---------|
| `typeof` | Get type string | `typeof x == "number"` |
| `instanceof` | Check instance | `x instanceof Array` |

---

## Operators

### Arithmetic
| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulo | `a % b` |
| `**` | Exponentiation | `a ** 2` |
| `-x` | Negation | `-value` |
| `+x` | Unary plus | `+string` |
| `++` | Increment | `i++` or `++i` |
| `--` | Decrement | `i--` or `--i` |

### Comparison
| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Loose equality | `a == b` |
| `!=` | Loose inequality | `a != b` |
| `===` | Strict equality | `a === b` |
| `!==` | Strict inequality | `a !== b` |
| `<` | Less than | `a < b` |
| `>` | Greater than | `a > b` |
| `<=` | Less than or equal | `a <= b` |
| `>=` | Greater than or equal | `a >= b` |

### Logical
| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | Logical AND | `a && b` |
| `\|\|` | Logical OR | `a \|\| b` |
| `!` | Logical NOT | `!value` |
| `??` | Nullish coalescing | `a ?? default` |

### Assignment
| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Assignment | `x = 10` |
| `+=` | Add-assign | `x += 5` |
| `-=` | Subtract-assign | `x -= 5` |
| `*=` | Multiply-assign | `x *= 2` |
| `/=` | Divide-assign | `x /= 2` |
| `%=` | Modulo-assign | `x %= 3` |

### Confidence Operators

#### Core Confidence
| Operator | Description | Example |
|----------|-------------|---------|
| `~>` | Attach confidence | `value ~> 0.85` |
| `~` | Extract confidence | `~value` (returns 0.85) |
| `<~` | Extract raw value | `<~value` (returns value) |

#### Confident Arithmetic
| Operator | Description | Example |
|----------|-------------|---------|
| `~+` | Confident add | `a ~+ b` |
| `~-` | Confident subtract | `a ~- b` |
| `~*` | Confident multiply | `a ~* b` |
| `~/` | Confident divide | `a ~/ b` |
| `~+=` | Confident add-assign | `x ~+= y` |
| `~-=` | Confident subtract-assign | `x ~-= y` |
| `~*=` | Confident multiply-assign | `x ~*= y` |
| `~/=` | Confident divide-assign | `x ~/= y` |

#### Confident Comparison
| Operator | Description | Example |
|----------|-------------|---------|
| `~==` | Confident equality | `a ~== b` |
| `~!=` | Confident inequality | `a ~!= b` |
| `~<` | Confident less than | `a ~< b` |
| `~>` | Confident greater than | `a ~> b` |
| `~<=` | Confident less/equal | `a ~<= b` |
| `~>=` | Confident greater/equal | `a ~>= b` |

#### Confident Logical
| Operator | Description | Example |
|----------|-------------|---------|
| `~&&` | Confident AND (min conf) | `a ~&& b` |
| `~\|\|` | Confident OR (max conf) | `a ~\|\| b` |
| `~\|\|>` | Parallel (highest conf wins) | `a ~\|\|> b` |

#### Confident Special
| Operator | Description | Example |
|----------|-------------|---------|
| `~.` | Confident property access | `obj~.prop` |
| `~?` | Confident ternary | `cond ~? a : b` |
| `~??` | Confidence coalesce | `a ~?? b` |
| `~@>` | Threshold gate | `value ~@> 0.8` |
| `~\|>` | Confidence pipeline | `data ~\|> process` |
| `~~` | Confidence chaining | `a ~~ b` |

### Other Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `\|>` | Pipeline | `x \|> fn1 \|> fn2` |
| `?.` | Optional chaining | `obj?.prop?.nested` |
| `...` | Spread/rest | `[...arr]` or `...params` |
| `? :` | Ternary | `cond ? a : b` |
| `->` | Context shift | `context a -> b { }` |

---

## Built-in Functions

### Output
| Function | Description | Example |
|----------|-------------|---------|
| `print(...)` | Print to console | `print("Hello", value)` |
| `console.log(...)` | Log message | `console.log("Info:", x)` |
| `console.warn(...)` | Warning | `console.warn("Caution")` |
| `console.error(...)` | Error | `console.error("Failed")` |
| `console.debug(...)` | Debug info | `console.debug("State:", s)` |

### Array Operations
| Function | Description | Example |
|----------|-------------|---------|
| `map(arr, fn)` | Transform elements | `map(nums, x => x * 2)` |
| `filter(arr, fn)` | Filter elements | `filter(nums, x => x > 0)` |
| `reduce(arr, fn, init)` | Reduce to value | `reduce(nums, (a,b) => a+b, 0)` |

### Math
| Function | Description | Example |
|----------|-------------|---------|
| `max(...vals)` | Maximum value | `max(1, 5, 3)` → `5` |
| `min(...vals)` | Minimum value | `min(1, 5, 3)` → `1` |

### Async
| Function | Description | Example |
|----------|-------------|---------|
| `delay(ms)` | Wait milliseconds | `await delay(1000)` |
| `sleep(ms)` | Alias for delay | `await sleep(500)` |
| `debounce(ms)` | Create debouncer | `debounce(300)` |
| `Promise.resolve(v)` | Resolved promise | `Promise.resolve(42)` |
| `Promise.reject(e)` | Rejected promise | `Promise.reject("err")` |
| `Promise.all(arr)` | Wait for all | `await Promise.all([p1, p2])` |

### Collections
| Function | Description | Example |
|----------|-------------|---------|
| `sortBy(key, dir?)` | Create sorter | `sortBy("name", "desc")` |
| `groupBy(key)` | Create grouper | `groupBy("category")` |

### Confidence
| Function | Description | Example |
|----------|-------------|---------|
| `confidence(val)` | Wrap with confidence | `confidence(0.9)(fn)` |
| `threshold(min)` | Filter by confidence | `threshold(0.8)(data)` |

### LLM
| Function | Description | Example |
|----------|-------------|---------|
| `llm(prompt, opts?)` | Query LLM | `llm("Summarize this")` |
| `stream_llm(prompt, opts?)` | Stream LLM | `stream_llm("Draft...")` |

---

## Common Patterns

### Confident Value Creation
```javascript
// Attach confidence to any value
temperature = 23.5 ~> 0.92
prediction = "sunny" ~> 0.75
data = {score: 85} ~> 0.88
```

### Uncertain Control Flow
```javascript
uncertain if (prediction) {
  high { executeWithConfidence() }
  medium { requestReview() }
  low { reject() }
  default { handleUnknown() }
}
```

### Async with Error Handling
```javascript
async function safeFetch(url) {
  try {
    response = await fetch(url)
    return response ~> 0.95
  } catch (error) {
    console.error("Fetch failed:", error)
    return null ~> 0.0
  }
}
```

### Pipeline Processing
```javascript
result = data
  |> filter(x => x > 0)
  |> map(x => x * 2)
  |> sortBy("value", "desc")(_)
  |> threshold(0.8)(_)
```

### LLM with Confidence
```javascript
analysis = llm("Analyze: " + text)

uncertain if (analysis) {
  high {
    // High confidence response
    applyAnalysis(analysis)
  }
  medium {
    // Needs human review
    flagForReview(analysis)
  }
  low {
    // Unreliable, get more info
    analysis = llm("Clarify: " + text, {temperature: 0.2})
  }
}
```

### Module Structure
```javascript
// utils.prism
export const VERSION = "1.0.0"
export function validate(input) {
  return input.length > 0
}

// main.prism
import {VERSION, validate} from "./utils.prism"
console.log("Version:", VERSION)
```

### Destructuring
```javascript
// Arrays
[first, second, ...rest] = [1, 2, 3, 4, 5]

// Objects
{name, age, city = "Unknown"} = user

// In function parameters
processPoint = ({x, y}) => Math.sqrt(x*x + y*y)
```

---

## Operator Precedence (High to Low)

1. `()` - Grouping
2. `.` `?.` `~.` `[]` - Property access
3. `++` `--` - Increment/decrement
4. `!` `-` `+` `~` `<~` - Unary
5. `**` - Exponentiation
6. `*` `/` `%` `~*` `~/` - Multiplicative
7. `+` `-` `~+` `~-` - Additive
8. `<` `>` `<=` `>=` `~<` `~>` `~<=` `~>=` - Relational
9. `==` `!=` `===` `!==` `~==` `~!=` - Equality
10. `&&` `~&&` - Logical AND
11. `||` `~||` `~||>` - Logical OR
12. `??` `~??` - Nullish/Confidence coalescing
13. `~>` - Confidence annotation
14. `? :` `~?` - Ternary
15. `|>` `~|>` - Pipeline
16. `=` `+=` `-=` etc. - Assignment

---

## Quick Tips

- **Confidence is optional**: Regular values have implicit confidence of 1.0
- **Confidence propagates**: Operations on confident values produce confident results
- **Use `~>` for annotation**: `value ~> 0.85` creates a confident value
- **Use `~` for extraction**: `~value` gets the confidence level
- **Pipeline for clarity**: `x |> fn1 |> fn2` is clearer than `fn2(fn1(x))`
- **Async is everywhere**: Most operations support async/await
- **Modules for organization**: Use import/export for larger projects
