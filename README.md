# YAML sript

YAML script is a small programming langage whith syntax is based on YAML.

Sample code:

```yaml
- [if: ['<': [1, 2], ['console.log': 'PASS']]]
- [if: ['>': [1, 2], ['console.log': 'FAILURE'], ['console.log': 'PASS']]]
```
