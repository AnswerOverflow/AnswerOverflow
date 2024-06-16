const { exec } = require('child_process');
const dotenv = require('dotenv');
// Replace 'your command here' with the actual command you want to execute

// load envs from .env file
const result = dotenv.config();
// map them all to --build-args
const buildArgs = Object.entries(result.parsed)
	// filter out empty values
	.filter(([_, value]) => value.length > 0)
	.map(([key, value]) => `--build-arg="${key}=${value}"`)
	.join(' ');
const command = `pnpm docker:build:main-site ${buildArgs} `;
// execute the command and log the output
exec(command, (error, stdout, stderr) => {
	if (error) {
		console.error(`exec error: ${error}`);
		return;
	}
	console.log(`stdout: ${stdout}`);
	console.error(`stderr: ${stderr}`);
});
