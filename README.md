# YAML script

YAML script is a small programming language with a syntax based on YAML.

Sample code:

```yaml
- [if: ['<': [1, 2], ['console.log': 'PASS']]]
- [if: ['>': [1, 2], ['console.log': 'FAILURE'], ['console.log': 'PASS']]]
```
