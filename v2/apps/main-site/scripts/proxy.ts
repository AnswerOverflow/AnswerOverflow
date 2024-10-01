import { createProxyServer } from "http-proxy";

// after 5 seconds
setTimeout(() => {
  console.log("Proxy is running on http://localhost:3001");
  createProxyServer({
    target: "http://localhost:3000",
  }).listen(3001);
}, 5000);
