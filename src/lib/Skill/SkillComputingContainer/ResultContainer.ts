import { StatComputed } from '@/lib/Character/Stat';

abstract class ResultContainerBase {
  /** The original data of attr */
  abstract readonly origin: string;

  /** The calculated value of attr */
  abstract readonly value: string;

  /** result to display */
  abstract get result(): string;

  /** method to modify result */
  abstract handle(handler: (value: string) => string): void;
}

class ResultContainer extends ResultContainerBase {
  override origin: string;
  override value: string;

  private _result: string;

  constructor(origin: string, value: string) {
    super();
    this.origin = origin;
    this.value = value;
    this._result = value.toString();
  }

  override get result() {
    return this._result;
  }

  override handle(handler: (value: string) => string) {
    this._result = handler(this._result);
  }
}

class ResultContainerStat extends ResultContainer {
  stat: StatComputed;

  constructor(origin: StatComputed, stat: StatComputed) {
    super(origin.value, stat.value);
    this.stat = stat;
  }
}

interface TextResultContainerParseResult {
  containers: ResultContainer[];
  parts: (string | ResultContainer)[];
}
const TEXT_PARSE_PATTERN = /\$\{[^}]+\}/g;
class TextResultContainer extends ResultContainerBase {
  override origin: string;
  override value: string;
  containers: ResultContainer[];
  parts: (string | ResultContainer)[];

  static parse(value: string): TextResultContainerParseResult {
    const textParts = value.split(TEXT_PARSE_PATTERN);
    const matches = value.match(TEXT_PARSE_PATTERN) || [];
    const
      parts: (string | ResultContainer)[] = [],
      containers: ResultContainer[] = [];
    Array(textParts.length + matches.length).fill('').forEach((el, idx) => {
      if (idx % 2 === 0) {
        parts.push(textParts.shift() as string);
      } else {
        const cur = matches.shift() as string;
        const container = new ResultContainer(cur, cur);
        containers.push(container);
        parts.push(container);
      }
    });

    return {
      parts,
      containers,
    };
  }

  constructor(origin: string, value: string, parseResult: TextResultContainerParseResult) {
    super();

    const { parts, containers } = parseResult;

    this.parts = parts;
    this.containers = containers;
    this.origin = origin;
    this.value = value;
  }

  override get result() {
    return this.parts.map(part => typeof part === 'string' ? part : part.result).join('');
  }

  override handle(handler: (value: string) => string) {
    this.containers.forEach(container => container.handle(handler));
  }
}

export { ResultContainerBase, ResultContainer, ResultContainerStat, TextResultContainer };
export type { TextResultContainerParseResult };

