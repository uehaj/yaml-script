import { AST } from './parser';
import config from './config';

class YamlScriptError extends Error {}
class Scope {}

abstract class AbstractFunction {
  abstract apply(arg: AST[], env: Scope): AST;
  abstract nArgs: number;
}

class PredefinedFunction extends AbstractFunction {
  func: (arg: AST[]) => AST;
  nArgs: number;
  constructor(func: (arg: AST[]) => AST, nArgs: number) {
    super();
    this.func = func;
    this.nArgs = nArgs;
  }
  apply(arg: AST[], env: Scope): AST {
    config.verbose && console.log(`PredefinedFunction.apply arg=${arg}`);
    return this.func(arg.map((elm) => evalYaml(elm, env)));
  }
}

class Fun2<T1, T2> extends PredefinedFunction {
  constructor(func: (a: T1, b: T2) => AST) {
    super(([a, b]) => func((a as unknown) as T1, (b as unknown) as T2), 2);
  }
}

class Fun1<T> extends PredefinedFunction {
  constructor(func: (a: T) => AST) {
    super(([a]) => func((a as unknown) as T), 1);
  }
}

class SpecialForm extends PredefinedFunction {
  apply(arg: AST[], env: Scope): AST {
    config.verbose && console.log(`SpecialForm.apply arg=${arg}`);
    return this.func(arg);
  }
}

function isASTArrayy(params: any): params is AST[] {
  if (Array.isArray(params)) {
    return true;
  }
  return false;
}
class UserDefinedFunction extends AbstractFunction {
  body: AST;
  params: AST[];
  nArgs: number;
  constructor(params: AST, body: AST) {
    super();
    this.body = body;
    if (!isASTArrayy(params)) {
      throw new YamlScriptError();
    }
    this.params = params;
    this.nArgs = params.length;
  }
  apply(args: AST[], env: Scope): AST {
    config.verbose &&
      console.log(
        `UserDefinedFunction.apply args=${args} params=${
          this.params
        } body=${JSON.stringify(this.body)}`
      );

    const functionLocalScope = Object.create(env);
    this.params.forEach((param, idx) => {
      (functionLocalScope as any)[param as string] = args[idx];
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
  ['if'] = new SpecialForm(([condPart, thenPart, elsePart]: AST[]) => {
    const cond = evalYaml(condPart, this);
    config.verbose && console.log(`cond=${cond}`);
    if (!!cond) {
      return evalYaml(thenPart, this);
    } else {
      return evalYaml(elsePart, this);
    }
  }, 3);
  ['while'] = new SpecialForm(([condPart, bodyPart]: AST[]) => {
    let result = undefined;
    while (!!evalYaml(condPart, this)) {
      result = evalYaml(bodyPart, this);
    }
    return null;
  }, 2);
  ['setq'] = new SpecialForm(([varName, exp]: AST[]) => {
    const value = evalYaml(exp, this);
    (this as any)[varName as string] = value;
    return value;
  }, 2);
  ['defun'] = new SpecialForm(([funcName, argList, body]: AST[]) => {
    (this as any)[funcName as string] = new UserDefinedFunction(argList, body);
    return body;
  }, 2);
}

const callJSFunction = (funcName: string, args: AST[]) => {
  const programText = `"use strict";return ${funcName}(...args);`;
  config.verbose && console.log(`programText = ${programText}`);
  return new Function('args', programText)(args);
};

function applyFunction(funcName: string, arg: AST[], env: Scope) {
  config.verbose &&
    console.log(
      `applyFunction funcName=${funcName}, arg=${JSON.stringify(
        arg
      )}, env=${JSON.stringify(Object.keys(env))}`
    );
  if (!!(env as any)[funcName]) {
    config.verbose && console.log(`[1]`);
    return (env as any)[funcName].apply(arg, env);
  } else {
    config.verbose && console.log(`[2] ${funcName}, ${typeof arg}`);
    arg = arg.map((elm) => evalYaml(elm, env));
    return callJSFunction(funcName, arg);
  }
  return undefined;
}

export function evalYaml(script: AST, env: Scope): AST {
  let result = null;
  if (Array.isArray(script)) {
    // [a,b,c] ==> eval(a),eval(c),result=eval(c)
    for (const elem of script) {
      result = evalYaml(elem, env);
    }
  } else if (typeof script === 'string') {
    if (script.startsWith('$')) {
      const varName = script.slice(1);
      return (env as any)[varName];
    }
    return script;
  } else if (typeof script === 'number' || typeof script === 'boolean') {
    // 3 ==> 3
    // true === true
    result = script;
  } else if (typeof script === 'object' && script !== null) {
    // {k1:v1, k2:v2} ==> k1(v1), result=k2(v2)
    for (const key of Object.keys(script)) {
      let arg = (script as any)[key];
      if (!Array.isArray(arg)) {
        arg = [arg];
      }
      result = applyFunction(key, arg, env);
    }
  } else {
    config.verbose && console.log(`script=${script}`);
    result = script;
  }
  return result;
}
