# YAML script

YAML script is a turing complete small programming language with a syntax based on YAML.

# Sample code

```yaml
- [if: ['<': [1, 2], ['console.log': 'PASS']]]
- [if: ['>': [1, 2], ['console.log': 'FAILURE'], ['console.log': 'PASS']]]
- function:
    - sum
    - [a]
    - if:
        - '===': [$a, 0]
        - 0
        - '+': [$a, sum: ['-': [$a, 1]]]
- console.log:
    - '===': [sum: 10, 55]
```

# Sample code: fibonacci number

```yaml
- function:
    - fibonacci1
    - [n]
    - 'if':
        - '||':
            - '===': [$n, 0]
            - '===': [$n, 1]
        - $n
        - '+':
            - fibonacci1:
                - '-': [$n, 2]
            - fibonacci1:
                - '-': [$n, 1]

- console.log:
    - fibonacci1: 10
```

# How to run

```
yarn run start samples/fibonacci.yaml
```
