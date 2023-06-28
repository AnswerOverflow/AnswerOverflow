import { createProxyServer } from 'http-proxy';

createProxyServer({
	target: 'http://localhost:3000',
}).listen(3001);
