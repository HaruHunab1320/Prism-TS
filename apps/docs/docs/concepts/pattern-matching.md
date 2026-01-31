---
sidebar_position: 5
title: Pattern Matching
---

# Pattern Matching

Prism supports Rust-style `match` expressions for structural matching with bindings, guards, and confidence thresholds. `match` is an expression, so it always returns a value.

## Basic Match

```prism
let result = match value {
  0 => "zero",
  1 => "one",
  _ => "other"
}
```

## Bindings and Wildcards

```prism
let label = match score {
  x if x > 90 => "A",
  _ => "not A"
}
```

Use `_` to ignore a value without binding.

## Array Patterns

```prism
let outcome = match [1, 2, 3] {
  [a, b, ...rest] => rest,
  _ => []
}
```

## Object Patterns

```prism
let message = match {type: "error", message: "fail"} {
  {type: "error", message} => message,
  _ => "ok"
}
```

## Nested Patterns

```prism
let status = match {meta: {ok: true}} {
  {meta: {ok: true}} => "ready",
  _ => "pending"
}
```

## Guards

```prism
let bucket = match value {
  x if x > 10 => "large",
  x if x > 0 => "small",
  _ => "zero"
}
```

## Confidence Thresholds

You can require confidence at the arm level or on individual elements/properties.

### Arm-Level Threshold

```prism
let verdict = match [10 ~> 0.9, 20 ~> 0.6] {
  [a, b] ~> 0.8 => "high",
  _ => "low"
}
```

### Per-Element Thresholds

```prism
let verdict = match [10 ~> 0.9, 20 ~> 0.6] {
  [a ~> 0.85, b ~> 0.5] => "ok",
  _ => "no"
}
```

### Per-Property Thresholds

```prism
let verdict = match {score: 90 ~> 0.7} {
  {score: s ~> 0.8} => "high",
  _ => "low"
}
```

## Scoping

Bindings inside a `match` arm are scoped to that arm only.
