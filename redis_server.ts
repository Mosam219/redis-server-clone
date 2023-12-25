import net, { Socket } from "net";
import { RedisDeserializer } from "./redis_deserializer";
import { RespType } from "./types";
import { RedisCommand } from "./redis_commands";
import { RedisSerializer } from "./redis_serializer";
import { RedisDataStore } from "./redis_data_store";

interface IRedisServer {
  host: string;
  port: number;
  startServer(): void;
  stopServer(): Promise<void>;
}

export class RedisServer implements IRedisServer {
  host: string;
  port: number;
  private server: net.Server;
  private serializer: RedisSerializer;
  private dataStore: RedisDataStore;
  private socketMap: Map<string, net.Socket>;

  constructor(port = 6379, host = "127.0.0.1") {
    this.host = host;
    this.port = port;
    this.server = new net.Server();
    this.serializer = new RedisSerializer();
    this.dataStore = new RedisDataStore();
    this.socketMap = new Map<string, net.Socket>();
  }

  startServer(): void {
    this.server.listen(this.port, this.host, () => {
      console.log(
        `server start running on host: ${this.host} port: ${this.port}`
      );
    });
    this.server.on("connection", (socket) => {
      console.log("connected");
      this.socketMap.set(
        socket.remoteAddress + ":" + socket.remotePort,
        socket
      );

      socket.on("error", (err) => {
        // End the Socket whe encountered an error.
        console.error(err.message);
        socket.end();
      });
      ``;

      socket.on("close", () => {
        this.socketMap.delete(socket.remoteAddress + ":" + socket.remotePort);
      });
      socket.on("data", (data) => {
        const input = data.toString();
        const dataLength = input.length;

        let currentPos = 0;

        while (currentPos < dataLength) {
          try {
            // Deserialize the data
            const deserializer = new RedisDeserializer(
              input.substring(currentPos),
              true
            );
            const serializedData = deserializer.parse() as Array<string>;

            // Update the current position
            currentPos += deserializer.getPos();
            // Handle the command received.
            this.handleRequest(socket, serializedData);
          } catch (e) {
            socket.emit("sendResponse", new Error("Cannot parse"));
            break;
          }
        }
      });

      socket.addListener("sendResponse", (data: RespType) => {
        const str = this.serializer.serialize(data, true);
        socket.write(str);
      });
    });
  }
  handleRequest(socket: net.Socket, output: string[]) {
    const command = output[0];
    switch (command) {
      case RedisCommand.PING: {
        this.handlePing(socket, output);
        break;
      }
      case RedisCommand.ECHO: {
        this.handleEcho(socket, output);
        break;
      }
      case RedisCommand.SET: {
        this.handleSet(socket, output);
        break;
      }
      case RedisCommand.GET: {
        this.handleGet(socket, output);
        break;
      }
    }
  }
  handlePing(socket: net.Socket, output: string[]) {
    if (!socket) {
      throw new Error("socket not available");
    }
    if (!output) {
      throw new Error("Invalid data");
    }
    const response = output[1] ?? "PONG";
    socket.emit("sendResponse", response);
  }

  handleEcho(socket: net.Socket, output: string[]) {
    if (!socket) {
      throw new Error("socket not available");
    }
    if (!output) {
      throw new Error("Invalid data");
    }
    const response = output[1];
    socket.emit("sendResponse", response);
  }

  handleSet(socket: net.Socket, output: string[]) {
    if (!socket) {
      throw new Error("socket not available");
    }
    if (!output) {
      throw new Error("Invalid data");
    }
    const key = output[1];
    const value = output[2];
    this.dataStore.setData(key, value);
    socket.emit("sendResponse", "+OK");
  }
  handleGet(socket: net.Socket, output: string[]) {
    if (!socket) {
      throw new Error("socket not available");
    }
    if (!output) {
      throw new Error("Invalid data");
    }
    const key = output[1];
    const value = this.dataStore.getData(key);
    socket.emit("sendResponse", value);
  }
  stopServer(): Promise<void> {
    return new Promise((res, rej) => {
      this.socketMap.forEach((socket) => socket.destroy());
      this.server.on("close", () => {
        res();
      });
      this.server?.close();
    });
  }
}
