# Adder of Time
A simple calculator that adds or subtracts time (duration)

### Time Format
#### Units
These units are supported
|Unit|Value|Conversion|
|-|-|-|
|d|days|1d = 24h|
|h|hours|1h = 60m|
|m|minutes|1m = 60s|
|s|seconds|1s = 1000|
|(no unit)|milliseconds||

#### Expressions
Each time (duration) expression is represented by concatenating value and units

For example, `24m27s267` is 24 minutes 27 seconds and 267 milliseconds

These expressions can be concatenated with `+` to be added or `-` to be subtracted

For example, `4h30m + 6h40m` is the same as `11h10m`

The inputs need not to be normalized. `10h70m` is totally valid input (but not valid output)

Multiple inputs can be separated by comma (`,`). Whitespaces(`\s`) in the expressions are ignored.

### Alignment
The calculator supports aligning milliseconds to frames.

For example, `233 + 733` is `966` in regular mode, but `967` in 30-fps mode because `233(7f) + 733(22f) = 967(29f)`