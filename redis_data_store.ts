import { RespType } from "./types";

interface IRedisDataStore {}
export class RedisDataStore implements IRedisDataStore {
  private map: Map<string, RespType>;
  constructor() {
    this.map = new Map<string, RespType>();
  }
  setData(key: string, data: RespType) {
    this.map.set(key, data);
  }
  getData(key: string): RespType | undefined {
    return this.map.get(key);
  }
  deleteData(key: string) {
    this.map.delete(key);
  }
}
