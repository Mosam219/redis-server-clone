import { randomBytes } from "crypto";
import { RedisClient } from "./redis_client";
import { RedisCommand } from "./redis_commands";

const redisClient = new RedisClient();
redisClient.connect();

process.stdin.on("data", async (input) => {
  const data = input.toString().trim();
  const inputData = data.split(" ");
  const command = inputData[0];
  if (data === "exit") {
    redisClient.disconnect();
    process.exit(0);
  }

  switch (command) {
    case RedisCommand.PING: {
      const message = inputData[1];
      await redisClient.ping(message);
      break;
    }
    case RedisCommand.ECHO: {
      const message = inputData[1];
      if (message === undefined) {
        console.error("Please provide a message");
        break;
      }
      await redisClient.echo(message);
      break;
    }
    case RedisCommand.SET: {
      const key = inputData[1];
      const value = inputData[2];
      if (key === undefined || value === undefined) {
        console.error("Please provide a data");
        break;
      }
      await redisClient.set(key, value);
      break;
    }
    case RedisCommand.GET: {
      const key = inputData[1];
      if (key === undefined) {
        console.error("Please provide a data");
        break;
      }
      await redisClient.get(key);
      break;
    }
  }
});
