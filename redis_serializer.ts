import { RespArray } from "./types";

const isValidRESP = (input: unknown): boolean => {
  console.log(input, typeof input);
  if (
    typeof input === "string" ||
    typeof input === "number" ||
    input === null ||
    input instanceof Error
  ) {
    return true;
  }

  if (Array.isArray(input)) {
    let isValid = true;
    for (let i = 0; i < input.length; i++) {
      isValid = isValid && isValidRESP(input[i]);
    }
    return isValid;
  }
  return false;
};

export class RedisSerializer {
  serialize(input: unknown, bulkString?: boolean) {
    console.log(input);
    if (input === null) {
      return this.serializeNull();
    } else if (typeof input == "number") {
      return this.serializeNumber(input);
    } else if (typeof input == "string") {
      return bulkString
        ? this.serializeBulkString(input)
        : this.serializeString(input);
    } else if (Array.isArray(input) && isValidRESP(input)) {
      return this.setializeArray(input, bulkString);
    } else if (input instanceof Error) {
      return this.serializerError(input);
    }

    throw new Error("Invalid input");
  }

  private serializerError(err: Error): string {
    return `-${err.message}\r\n`;
  }

  serializeBulkString(input: string) {
    return `$${input.length}\r\n${input}\r\n`;
  }

  serializeString(input: string) {
    if (input.indexOf("\r") != -1 || input.indexOf("\n") != -1) {
      throw new Error("Simple string contains LF or CR character");
    }
    return `+${input}\r\n`;
  }

  serializeNumber(input: number) {
    if (Math.floor(input) != input) {
      throw new Error("Invalid integer");
    }
    return ":" + input + "\r\n";
  }

  setializeArray(input: RespArray, useBulkString?: boolean): string {
    if (input == null) return "*-1\r\n";
    let str = "*" + input.length + "\r\n";
    for (let i = 0; i < input.length; i++) {
      str += this.serialize(input[i], useBulkString);
    }
    return str;
  }

  serializeNull() {
    return "$-1\r\n";
  }
}
