# Confidence-Based Destructuring in Prism

Prism provides a unique feature that allows you to destructure values based on their confidence levels. This enables you to filter out low-confidence values during assignment, making your code more robust when dealing with uncertain data.

## Overview

Confidence-based destructuring extends the standard destructuring syntax with confidence thresholds. Values that don't meet the specified threshold are assigned as `undefined`.

## Syntax Options

### Option 1: Global Threshold

Apply a single confidence threshold to all destructured values:

```prism
// Array destructuring with global threshold
[a, b, c] ~> 0.7 = data;

// Object destructuring with global threshold  
{name, age, email} ~> 0.8 = user;
```

### Option 3: Per-Element Threshold

Apply individual thresholds to specific elements:

```prism
// Array destructuring with per-element thresholds
[a ~> 0.9, b ~> 0.5, c] = data;

// Object destructuring with per-property thresholds
{name: userName ~> 0.9, age ~> 0.8} = user;
```

## How It Works

When a value's confidence is below the specified threshold:
- The variable is assigned `undefined`
- For nested patterns, an empty array/object is destructured
- Rest elements only collect values that meet the threshold

## Examples

### Basic Array Destructuring

```prism
data = [10 ~> 0.9, 20 ~> 0.6, 30 ~> 0.8];

// Global threshold
[a, b, c] ~> 0.7 = data;
// a = 10 (0.9 > 0.7)
// b = undefined (0.6 < 0.7)
// c = 30 (0.8 > 0.7)

// Per-element thresholds
[x ~> 0.8, y ~> 0.7, z ~> 0.5] = data;
// x = 10 (0.9 > 0.8)
// y = undefined (0.6 < 0.7)
// z = 30 (0.8 > 0.5)
```

### Object Destructuring

```prism
sensor = {
  temp: 25.5 ~> 0.95,
  humidity: 60 ~> 0.4,
  pressure: 1013 ~> 0.85
};

// Extract only high-confidence readings
{temp, humidity, pressure} ~> 0.8 = sensor;
// temp = 25.5
// humidity = undefined
// pressure = 1013
```

### Rest Elements

```prism
values = [1 ~> 0.9, 2 ~> 0.5, 3 ~> 0.8, 4 ~> 0.6];

// Rest elements only collect values above threshold
[first, ...rest] ~> 0.7 = values;
// first = 1
// rest = [3] (only 3 has confidence > 0.7)
```

### Nested Patterns

```prism
complex = {
  data: [100 ~> 0.9, 200 ~> 0.6, 300 ~> 0.8]
};

// Threshold on nested pattern applies to elements inside
{data: [x, y, z] ~> 0.7} = complex;
// x = 100
// y = undefined
// z = 300
```

### Combined Thresholds

When using both global and per-element thresholds, per-element thresholds take precedence:

```prism
data = [10 ~> 0.6, 20 ~> 0.8, 30 ~> 0.5];

// a uses 0.4 threshold, b and c use 0.7 global threshold
[a ~> 0.4, b, c] ~> 0.7 = data;
// a = 10 (0.6 > 0.4)
// b = 20 (0.8 > 0.7)
// c = undefined (0.5 < 0.7)
```

## Real-World Use Cases

### Filtering Sensor Readings

```prism
readings = [
  {temp: 25.5 ~> 0.95, time: "10:00"},
  {temp: 26.1 ~> 0.4, time: "10:01"},
  {temp: 25.8 ~> 0.85, time: "10:02"}
];

filtered = [];
for reading in readings {
  // Only extract high-confidence temperatures
  {temp ~> 0.8} = reading;
  if (temp) {
    filtered = [...filtered, {temp: temp, time: reading.time}]
  }
}
// filtered contains only readings with confidence > 0.8
```

### Extracting Trusted User Data

```prism
userData = {
  name: "John" ~> 0.99,
  email: "john@example.com" ~> 0.7,
  phone: "555-1234" ~> 0.3,
  verified: true ~> 0.95
};

// Extract only highly confident fields
{name ~> 0.9, email ~> 0.9, phone ~> 0.9, verified ~> 0.9} = userData;

// Build trusted data object
trustedData = {};
if (name) trustedData = {...trustedData, name: name};
if (verified) trustedData = {...trustedData, verified: verified};
// trustedData = {name: "John", verified: true}
```

### Mixed Confidence Handling

```prism
// Non-confident values are treated as having confidence 1.0
mixed = [100, 200 ~> 0.5, 300];
[x, y, z] ~> 0.8 = mixed;
// x = 100 (non-confident = 1.0)
// y = undefined (0.5 < 0.8)
// z = 300 (non-confident = 1.0)
```

## Best Practices

1. **Use global thresholds** when you want uniform filtering across all values
2. **Use per-element thresholds** when different fields have different reliability requirements
3. **Check for undefined** after destructuring with thresholds to handle filtered values
4. **Combine with rest elements** to collect only high-confidence values
5. **Nest patterns with thresholds** to filter at multiple levels

## Edge Cases

- **Threshold of 0**: All values pass (including those with 0% confidence)
- **Threshold of 1**: Only non-confident values and 100% confident values pass
- **Non-numeric thresholds**: Throw a runtime error
- **Undefined handling**: Filtered values become `undefined`, not missing

## Implementation Notes

- Confidence thresholds are evaluated at runtime
- Variables that don't meet thresholds are still declared but assigned `undefined`
- Rest elements dynamically filter based on confidence
- Nested destructuring inherits thresholds from parent patterns