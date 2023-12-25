type RespType = string | number | null | Error | RespArray;

type RespArray = RespType[] | null;

export { RespArray, RespType };
