# YAML script

YAML script is a turing complete small programming language with a syntax based on YAML.

Sample code:

```yaml
- [if: ['<': [1, 2], ['console.log': 'PASS']]]
- [if: ['>': [1, 2], ['console.log': 'FAILURE'], ['console.log': 'PASS']]]
- defun:
    - sum
    - [a]
    - if:
        - '===': [$a, 0]
        - 0
        - '+': [$a, sum: ['-': [$a, 1]]]
- console.log:
    - '===': [sum: 10, 55]
```
