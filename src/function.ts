import { AST, isASTArray } from './parser';
import config from './config';
import { evalYaml, YamlScriptError, Scope } from './interp';

abstract class AbstractFunction {
  abstract applyFunc(arg: AST[], env: Scope): AST;
  abstract nArgs: number;
}

class PredefinedFunction extends AbstractFunction {
  func: (arg: AST[], env: Scope) => AST;
  nArgs: number;
  constructor(func: (arg: AST[], env: Scope) => AST, nArgs: number) {
    super();
    this.func = func;
    this.nArgs = nArgs;
  }
  applyFunc(arg: AST[], env: Scope): AST {
    config.verbose && console.log(`PredefinedFunction.apply arg=${arg}`);
    return this.func(
      arg.map((elm) => evalYaml(elm, env)),
      env
    );
  }
}

class Fun2<T1, T2> extends PredefinedFunction {
  constructor(func: (a: T1, b: T2, env: Scope) => AST) {
    super(
      ([a, b]: AST[], env: Scope) =>
        func((a as unknown) as T1, (b as unknown) as T2, env),
      2
    );
  }
}

class Fun1<T> extends PredefinedFunction {
  constructor(func: (a: T, env: Scope) => AST) {
    super(([a], env) => func((a as unknown) as T, env), 1);
  }
}

class SpecialForm extends PredefinedFunction {
  applyFunc(arg: AST[], env: Scope): AST {
    config.verbose && console.log(`SpecialForm.apply arg=${arg}`);
    return this.func(arg, env);
  }
}

class UserDefinedFunction extends AbstractFunction {
  body: AST;
  params: AST[];
  nArgs: number;
  constructor(params: AST, body: AST) {
    super();
    this.body = body;
    if (!isASTArray(params)) {
      throw new YamlScriptError('Function parameters must be an array.');
    }
    this.params = params;
    this.nArgs = params.length;
  }
  applyFunc(args: AST[], env: Scope): AST {
    config.verbose &&
      console.log(
        `UserDefinedFunction.apply args=${args} params=${
          this.params
        } body=${JSON.stringify(this.body)}`
      );

    const functionLocalScope = Object.create(env);
    this.params.forEach((param, idx) => {
      (functionLocalScope as any)[param as string] = evalYaml(args[idx], env);
    });

    return evalYaml(this.body, functionLocalScope);
  }
}

export class TopLevelScope extends Scope {
  ['+'] = new Fun2<number, number>((a, b) => a + b);
  ['-'] = new Fun2<number, number>((a, b) => a - b);
  ['*'] = new Fun2<number, number>((a, b) => a * b);
  ['/'] = new Fun2<number, number>((a, b) => a / b);
  ['**'] = new Fun2<number, number>((a, b) => a ** b);
  ['%'] = new Fun2<number, number>((a, b) => a % b);
  ['=='] = new Fun2<number, number>((a, b) => a == b);
  ['==='] = new Fun2<number, number>((a, b) => a === b);
  ['!='] = new Fun2<number, number>((a, b) => a != b);
  ['!=='] = new Fun2<number, number>((a, b) => a !== b);
  ['>'] = new Fun2<number, number>((a, b) => a > b);
  ['<'] = new Fun2<number, number>((a, b) => a < b);
  ['>='] = new Fun2<number, number>((a, b) => a >= b);
  ['<='] = new Fun2<number, number>((a, b) => a <= b);
  ['&&'] = new Fun2<boolean, boolean>((a, b) => a && b);
  ['||'] = new Fun2<boolean, boolean>((a, b) => a || b);
  ['!'] = new Fun1<boolean>((a) => !a);
  ['typeof'] = new Fun1<any>((a) => typeof a);
  ['instanceof'] = new Fun2<any, any>((a, b) => a instanceof b);
  ['&'] = new Fun2<number, number>((a, b) => a & b);
  ['|'] = new Fun2<number, number>((a, b) => a | b);
  ['~'] = new Fun1<number>((a: any) => ~a);
  ['^'] = new Fun2<number, number>((a, b) => a ^ b);
  ['<<'] = new Fun2<number, number>((a, b) => a << b);
  ['>>'] = new Fun2<number, number>((a, b) => a >> b);
  ['>>>'] = new Fun2<number, number>((a, b) => a >>> b);
  ['if'] = new SpecialForm(
    ([condPart, thenPart, elsePart]: AST[], env: Scope) => {
      const cond = evalYaml(condPart, env);
      config.verbose && console.log(`cond=${cond}`);
      let result = undefined;
      if (!!cond) {
        result = evalYaml(thenPart, env);
      } else {
        result = evalYaml(elsePart, env);
      }
      return result;
    },
    3
  );
  ['while'] = new SpecialForm(
    ([condPart, ...bodiesPart]: AST[], env: Scope) => {
      let result = undefined;
      while (!!evalYaml(condPart, env)) {
        bodiesPart.forEach((bodyPart) => {
          result = evalYaml(bodyPart, env);
        });
      }
      return null;
    },
    2
  );
  ['let'] = new SpecialForm(([varName, exp]: AST[], env: Scope) => {
    const value = evalYaml(exp, env);
    (this as any)[varName as string] = value;
    return value;
  }, 2);
  ['function'] = new SpecialForm(
    ([funcName, argList, ...body]: AST[], env: Scope) => {
      (env as any)[funcName as string] = new UserDefinedFunction(argList, body);
      return body;
    },
    3
  );
  ['list'] = new SpecialForm(([...elements]: AST[], env: Scope) => {
    return elements;
  }, 1);
}
