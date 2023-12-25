import { RedisServer } from "./redis_server";

const redisServer = new RedisServer(6379, "127.0.0.1");

redisServer.startServer();
