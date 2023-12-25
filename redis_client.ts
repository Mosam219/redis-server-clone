import net from "net";
import { RedisCommand } from "./redis_commands";
import { Queue } from "./utils/queue";
import { RedisSerializer } from "./redis_serializer";
import { RedisDeserializer } from "./redis_deserializer";
interface IRedisClient {
  host: string;
  port: number;
  connect(): void;
  ping(message?: string): void;
}

interface ICommandWaitingForReply {
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
}

class CommandWaitingForReply implements ICommandWaitingForReply {
  resolve;
  reject;
  constructor(res: (value: unknown) => void, rej: (value: unknown) => void) {
    this.reject = rej;
    this.resolve = res;
  }
}

export class RedisClient implements IRedisClient {
  host;
  port;
  private sock?: net.Socket;
  private commandsQueue: Queue<ICommandWaitingForReply>;
  private serializer = new RedisSerializer();

  constructor(port = 6379, host = "127.0.0.1") {
    this.port = port;
    this.host = host;
    this.commandsQueue = new Queue<ICommandWaitingForReply>();
  }

  async connect(): Promise<void> {
    this.sock = net.connect(this.port, this.host);
    this.sock.setTimeout(30000);

    this.sock.on("connect", () => {
      console.log("client connected");
    });

    this.sock.on("timeout", () => {
      console.error("Socket timeout");
      this.sock?.end();
    });

    this.sock.on("error", (err) => {
      console.error(err);
      this.sock?.destroy();
    });

    this.sock.on("close", () => {
      console.log("Connection Closed");
    });

    this.sock.on("data", (data) => {
      const elm = this.commandsQueue.dequeue();

      try {
        const ans = new RedisDeserializer(data.toString()).parse();
        elm?.resolve(ans);
      } catch (e) {
        console.log(e);
      }
    });
  }

  private async write(data: Array<string>): Promise<unknown> {
    if (this.sock && this.sock?.readyState == "open") {
      const newPromise = new Promise((res, rej) => {
        const item = new CommandWaitingForReply(res, rej);
        this.commandsQueue.enqueue(item);
      });

      this.sock.write(this.serializer.serialize(data, true));
      return newPromise;
    }
    throw new Error("connection is not established");
  }

  async ping(message?: string | undefined): Promise<void> {
    const data: string[] = [RedisCommand.PING];
    if (message) {
      data.push(message);
    }
    console.log(await this.write(data));
  }

  async echo(message: string): Promise<void> {
    const data: string[] = [RedisCommand.ECHO, message];
    console.log(await this.write(data));
  }

  async set(key: string, value: string): Promise<void> {
    const data: string[] = [RedisCommand.SET, key, value];
    console.log(await this.write(data));
  }
  async get(key: string): Promise<void> {
    const data: string[] = [RedisCommand.GET, key];
    console.log(await this.write(data));
  }

  disconnect() {
    this.sock?.destroy();
  }
}
