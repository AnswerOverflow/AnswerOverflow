import { Snowflake, SnowflakeUtil } from "discord.js";

export function getRandomTime(start?: Date, end?: Date) {
  if (!start) {
    start = new Date(2015, 0, 1);
  }
  if (!end) {
    end = new Date();
  }
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomSnowflake(start?: Date, end?: Date) {
  return SnowflakeUtil.generate({ timestamp: getRandomTime(start, end) });
}

export function isSnowflakeLargerAsInt(a: Snowflake, b: Snowflake) {
  return !isSnowflakeLarger(a, b) ? -1 : isSnowflakeLarger(a, b) ? 1 : 0;
}

export function isSnowflakeLarger(a: Snowflake, b: Snowflake) {
  const a_as_big_int = BigInt(a);
  const b_as_big_int = BigInt(b);
  return a_as_big_int > b_as_big_int;
}
