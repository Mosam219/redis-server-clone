import { RespType } from "./types";

interface IRedisDeserializer {
  parse(): RespType;
}
export class RedisDeserializer implements IRedisDeserializer {
  private input: string;
  private pos: number;
  private multiple: boolean;

  constructor(input: string, multiple: boolean = false) {
    this.input = input;
    this.pos = 0;
    this.multiple = multiple;
  }

  public parse(): RespType {
    const output = this.parseValue();
    if (this.hasNext() && !this.multiple) {
      throw new Error(
        `Invalid token ${JSON.stringify(this.getCurrentToken())} at ${this.pos}`
      );
    }
    return output;
  }

  private hasNext(): boolean {
    return this.input.codePointAt(this.pos) !== undefined;
  }

  parseArrays() {
    this.consumeToken("*");
    const len = this.getArrayLength();
    if (len === -1) {
      return null;
    }
    if (len === 0) {
      return [];
    }

    const output = Array<RespType>(len);
    let idx = 0;
    while (idx < len) {
      if (this.pos >= this.input.length) {
        throw new Error(
          `Index out of bounds ${this.pos} >= ${this.input.length}`
        );
      }
      const element = this.parseValue();
      output[idx] = element;
      idx++;
    }
    return output;
  }
  parseValue(): RespType {
    const token = this.getCurrentToken();
    switch (token) {
      case "+":
        return this.parseSimpleString();
      case "-":
        return this.parseError();
      case ":":
        return this.parseInteger();
      case "$":
        return this.parseBulkString();
      case "*":
        return this.parseArrays();
      default:
        throw new Error(`Invalid Token ${token} at ${this.pos}`);
    }
  }

  getArrayLength() {
    if (this.getCurrentToken() === "-") {
      this.consumeToken("-");
      this.consumeToken("1");
      this.consumeToken("\r");
      this.consumeToken("\n");
      return -1;
    }
    let ans = 0;

    while (this.pos < this.input.length && this.getCurrentToken() !== "\r") {
      ans = ans * 10 + parseInt(this.getCurrentToken());
      this.consumeToken();
    }

    this.consumeToken("\r");
    this.consumeToken("\n");

    return ans;
  }

  parseInteger() {
    this.consumeToken(":");

    let ans = 0;

    while (this.getCurrentToken() !== "\r" && this.pos < this.input.length) {
      ans = ans * 10 + parseInt(this.getCurrentToken());
      this.consumeToken();
    }

    this.consumeToken("\r");
    this.consumeToken("\n");
    return ans;
  }

  parseBulkString() {
    this.consumeToken("$");

    const len = this.getArrayLength();
    if (len === -1) return null;

    let output = "";
    let i = 0;
    while (i < len && this.pos <= this.input.length) {
      output += this.getCurrentToken();
      this.consumeToken();
      i++;
    }

    this.consumeToken("\r");
    this.consumeToken("\n");
    return output;
  }
  parseError() {
    this.consumeToken("-");

    let message = "";

    while (this.getCurrentToken() !== "\r" && this.pos < this.input.length) {
      message += this.getCurrentToken();
      this.consumeToken();
    }

    this.consumeToken("\r");
    this.consumeToken("\n");

    return new Error(message);
  }
  parseSimpleString() {
    let output = "";
    this.consumeToken("+");
    while (this.pos <= this.input.length && this.getCurrentToken() != "\r") {
      output += this.getCurrentToken();
      this.consumeToken();
    }

    this.consumeToken("\r");
    this.consumeToken("\n");
    return output;
  }

  private consumeToken(token?: string) {
    if (token && this.getCurrentToken() != token) {
      throw new Error("token and current position token is not matching");
    }
    this.pos++;
  }

  private getCurrentToken() {
    return this.input[this.pos];
  }

  getPos() {
    return this.pos;
  }
}
