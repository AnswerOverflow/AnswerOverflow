import { createProxyServer } from 'http-proxy';

// after 5 seconds
setTimeout(() => {
	createProxyServer({
		target: 'http://localhost:3000',
	}).listen(3001);
}, 5000);
