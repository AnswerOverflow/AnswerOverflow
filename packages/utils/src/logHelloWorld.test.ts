import { log } from './index';

jest.spyOn(global.console, "log");

describe("logger", () => {
  it("prints a message", () => {
    log("hello");
    expect(console.log).toBeCalled();
  });
});