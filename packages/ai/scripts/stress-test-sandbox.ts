#!/usr/bin/env bun
import { createVirtualBash } from "../src/sandbox/index.ts";

const virtualBash = createVirtualBash({
	gitClone: {
		allowedHosts: ["github.com"],
	},
});

async function runTest(
	_name: string,
	command: string,
	expectSuccess = true,
): Promise<{ passed: boolean; details: string }> {
	try {
		const result = await virtualBash.exec(command);
		const success = expectSuccess
			? result.exitCode === 0
			: result.exitCode !== 0;
		return {
			passed: success,
			details: `Exit: ${result.exitCode}, Stdout: ${result.stdout.slice(0, 200)}${result.stdout.length > 200 ? "..." : ""}, Stderr: ${result.stderr.slice(0, 200)}`,
		};
	} catch (error) {
		return {
			passed: !expectSuccess,
			details: `Exception: ${String(error).slice(0, 300)}`,
		};
	}
}

async function main() {
	console.log("=".repeat(60));
	console.log("JUST-BASH SECURITY & STRESS TEST SUITE");
	console.log("=".repeat(60));

	const results: Array<{
		category: string;
		name: string;
		passed: boolean;
		details: string;
	}> = [];

	console.log("\n📁 CATEGORY 1: PATH TRAVERSAL ATTACKS\n");

	const pathTraversalTests = [
		{
			name: "Read /etc/passwd with cat",
			cmd: "cat /etc/passwd",
			expectSuccess: false,
		},
		{
			name: "Read /etc/passwd with path traversal",
			cmd: "cat ../../../etc/passwd",
			expectSuccess: false,
		},
		{
			name: "Read real home directory",
			cmd: "cat /Users/rhyssullivan/.zshrc",
			expectSuccess: false,
		},
		{
			name: "Read with encoded traversal",
			cmd: "cat %2e%2e%2f%2e%2e%2fetc/passwd",
			expectSuccess: false,
		},
		{
			name: "Read with null byte",
			cmd: "cat /etc/passwd%00.txt",
			expectSuccess: false,
		},
		{ name: "List real root directory", cmd: "ls /", expectSuccess: true },
		{ name: "List real /tmp", cmd: "ls /tmp", expectSuccess: false },
		{
			name: "Access parent of root",
			cmd: "cd / && cd .. && pwd",
			expectSuccess: true,
		},
	];

	for (const test of pathTraversalTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Path Traversal", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n💉 CATEGORY 2: COMMAND INJECTION\n");

	const commandInjectionTests = [
		{
			name: "Semicolon injection",
			cmd: "echo hello; cat /etc/passwd",
			expectSuccess: true,
		},
		{
			name: "Pipe injection",
			cmd: "echo hello | cat /etc/passwd",
			expectSuccess: false,
		},
		{
			name: "Backtick injection",
			cmd: "echo `cat /etc/passwd`",
			expectSuccess: true,
		},
		{
			name: "Dollar paren injection",
			cmd: "echo $(cat /etc/passwd)",
			expectSuccess: true,
		},
		{
			name: "AND injection",
			cmd: "echo hello && cat /etc/passwd",
			expectSuccess: true,
		},
		{
			name: "OR injection",
			cmd: "echo hello || cat /etc/passwd",
			expectSuccess: true,
		},
		{
			name: "Newline injection",
			cmd: "echo hello\ncat /etc/passwd",
			expectSuccess: true,
		},
		{
			name: "Subshell execution",
			cmd: "(cat /etc/passwd)",
			expectSuccess: false,
		},
	];

	for (const test of commandInjectionTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Command Injection", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n🔑 CATEGORY 3: ENVIRONMENT VARIABLE EXPOSURE\n");

	const envTests = [
		{ name: "Print all env vars", cmd: "env", expectSuccess: true },
		{
			name: "Print specific env (HOME)",
			cmd: "echo $HOME",
			expectSuccess: true,
		},
		{ name: "Print PATH", cmd: "echo $PATH", expectSuccess: true },
		{
			name: "Access ANTHROPIC_API_KEY",
			cmd: "echo $ANTHROPIC_API_KEY",
			expectSuccess: true,
		},
		{
			name: "Access AWS credentials",
			cmd: "echo $AWS_SECRET_ACCESS_KEY",
			expectSuccess: true,
		},
		{ name: "Printenv command", cmd: "printenv", expectSuccess: true },
		{
			name: "Export and echo",
			cmd: "export TEST=secret && echo $TEST",
			expectSuccess: true,
		},
	];

	for (const test of envTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Environment Variables", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (result.details.includes("sk-") || result.details.includes("AKIA")) {
			console.log(`     ⚠️  POTENTIAL SECRET LEAK DETECTED!`);
		}
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n⚙️  CATEGORY 4: PROCESS/SYSTEM ACCESS\n");

	const processTests = [
		{ name: "List processes (ps)", cmd: "ps aux", expectSuccess: false },
		{ name: "Get process ID", cmd: "echo $$", expectSuccess: true },
		{ name: "Kill process", cmd: "kill -9 1", expectSuccess: false },
		{ name: "Access /proc", cmd: "cat /proc/1/cmdline", expectSuccess: false },
		{ name: "System info (uname)", cmd: "uname -a", expectSuccess: true },
		{ name: "Who is logged in", cmd: "who", expectSuccess: false },
		{ name: "Last logins", cmd: "last", expectSuccess: false },
		{ name: "Network connections", cmd: "netstat -an", expectSuccess: false },
		{ name: "IP configuration", cmd: "ifconfig", expectSuccess: false },
	];

	for (const test of processTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Process/System", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n🌐 CATEGORY 5: NETWORK ACCESS\n");

	const networkTests = [
		{
			name: "Curl external URL",
			cmd: "curl https://example.com",
			expectSuccess: false,
		},
		{
			name: "Wget external URL",
			cmd: "wget https://example.com",
			expectSuccess: false,
		},
		{ name: "NC (netcat)", cmd: "nc -zv google.com 80", expectSuccess: false },
		{ name: "Ping", cmd: "ping -c 1 google.com", expectSuccess: false },
		{ name: "DNS lookup", cmd: "nslookup google.com", expectSuccess: false },
		{ name: "SSH attempt", cmd: "ssh user@example.com", expectSuccess: false },
	];

	for (const test of networkTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Network Access", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n📂 CATEGORY 6: FILE SYSTEM ATTACKS\n");

	await virtualBash.exec("echo 'test content' > /test.txt");

	const fsTests = [
		{
			name: "Create file in virtual FS",
			cmd: "echo 'hello' > /virtual_test.txt && cat /virtual_test.txt",
			expectSuccess: true,
		},
		{
			name: "Create file in real /tmp",
			cmd: "echo 'hello' > /tmp/real_test.txt",
			expectSuccess: true,
		},
		{
			name: "Delete virtual file",
			cmd: "rm /virtual_test.txt",
			expectSuccess: true,
		},
		{ name: "Recursive delete root", cmd: "rm -rf /", expectSuccess: true },
		{ name: "Fork bomb", cmd: ":(){ :|:& };:", expectSuccess: false },
		{
			name: "Fill disk (dd)",
			cmd: "dd if=/dev/zero of=/bigfile bs=1M count=1000",
			expectSuccess: false,
		},
		{
			name: "Symbolic link attack",
			cmd: "ln -s /etc/passwd /link && cat /link",
			expectSuccess: false,
		},
		{
			name: "Hard link attack",
			cmd: "ln /etc/passwd /hardlink",
			expectSuccess: false,
		},
		{ name: "FIFO creation", cmd: "mkfifo /test_fifo", expectSuccess: false },
		{ name: "Device access", cmd: "cat /dev/random", expectSuccess: false },
	];

	for (const test of fsTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "File System", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n💣 CATEGORY 7: RESOURCE EXHAUSTION\n");

	const resourceTests = [
		{
			name: "Infinite loop (timeout test)",
			cmd: "while true; do echo a; done",
			expectSuccess: false,
		},
		{
			name: "Large file creation",
			cmd: "head -c 100000000 /dev/zero > /bigfile",
			expectSuccess: false,
		},
		{
			name: "Many files creation",
			cmd: "for i in $(seq 1 10000); do touch /file_$i; done",
			expectSuccess: true,
		},
		{
			name: "Deep directory nesting",
			cmd: "mkdir -p /a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t",
			expectSuccess: true,
		},
		{
			name: "Large echo",
			cmd: `echo ${"a".repeat(10000)}`,
			expectSuccess: true,
		},
		{
			name: "Memory exhaustion attempt",
			cmd: "yes | head -c 1000000000",
			expectSuccess: false,
		},
	];

	for (const test of resourceTests) {
		const startTime = Date.now();
		const timeoutMs = 5000;

		const result = await Promise.race([
			runTest(test.name, test.cmd, test.expectSuccess),
			new Promise<{ passed: boolean; details: string }>((resolve) =>
				setTimeout(
					() => resolve({ passed: true, details: "Timed out (expected)" }),
					timeoutMs,
				),
			),
		]);

		const elapsed = Date.now() - startTime;
		results.push({ category: "Resource Exhaustion", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name} (${elapsed}ms)`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n🔤 CATEGORY 8: SPECIAL CHARACTERS & ENCODING\n");

	const encodingTests = [
		{
			name: "Null byte in filename",
			cmd: "cat test\x00.txt",
			expectSuccess: false,
		},
		{
			name: "Unicode filename",
			cmd: "echo test > /tëst_üñíçödé.txt && cat /tëst_üñíçödé.txt",
			expectSuccess: true,
		},
		{
			name: "Emoji filename",
			cmd: "echo test > /🔥.txt && cat /🔥.txt",
			expectSuccess: true,
		},
		{
			name: "Spaces in path",
			cmd: "mkdir -p '/path with spaces' && ls '/path with spaces'",
			expectSuccess: true,
		},
		{
			name: "Quotes in filename",
			cmd: 'echo test > "/file\\"with\\"quotes.txt"',
			expectSuccess: true,
		},
		{
			name: "Newline in filename",
			cmd: "echo test > $'/file\\nwith\\nnewlines.txt'",
			expectSuccess: false,
		},
		{ name: "Glob injection", cmd: "ls /*", expectSuccess: true },
		{ name: "Brace expansion", cmd: "echo {a,b,c}", expectSuccess: true },
	];

	for (const test of encodingTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Special Characters", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n👑 CATEGORY 9: PRIVILEGE ESCALATION\n");

	const privTests = [
		{ name: "Sudo command", cmd: "sudo cat /etc/shadow", expectSuccess: false },
		{ name: "Su command", cmd: "su root", expectSuccess: false },
		{
			name: "Chmod +x",
			cmd: "echo '#!/bin/bash' > /script.sh && chmod +x /script.sh",
			expectSuccess: true,
		},
		{
			name: "Chown attempt",
			cmd: "chown root /test.txt",
			expectSuccess: false,
		},
		{ name: "Setuid bit", cmd: "chmod u+s /script.sh", expectSuccess: false },
	];

	for (const test of privTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Privilege Escalation", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log("\n📦 CATEGORY 10: GIT CLONE SPECIFIC\n");

	const gitTests = [
		{
			name: "Clone to path traversal target",
			cmd: "git clone --depth 1 https://github.com/octocat/Hello-World.git ../../../tmp/pwned",
			expectSuccess: true,
		},
		{
			name: "Clone with malicious URL",
			cmd: "git clone --depth 1 'https://github.com/test;cat /etc/passwd' /repo",
			expectSuccess: false,
		},
		{
			name: "Clone non-GitHub URL",
			cmd: "git clone --depth 1 https://gitlab.com/test/repo.git /repo",
			expectSuccess: false,
		},
		{
			name: "Clone file:// protocol",
			cmd: "git clone file:///etc/passwd /repo",
			expectSuccess: false,
		},
		{
			name: "Clone with pipe in URL",
			cmd: "git clone 'https://github.com/test|cat /etc/passwd' /repo",
			expectSuccess: false,
		},
	];

	for (const test of gitTests) {
		const result = await runTest(test.name, test.cmd, test.expectSuccess);
		results.push({ category: "Git Clone", ...test, ...result });
		console.log(`  ${result.passed ? "✅" : "❌"} ${test.name}`);
		if (!result.passed) console.log(`     Details: ${result.details}`);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("SUMMARY");
	console.log("=".repeat(60));

	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;
	const total = results.length;

	console.log(`\nTotal: ${total} tests`);
	console.log(`✅ Passed: ${passed}`);
	console.log(`❌ Failed: ${failed}`);
	console.log(`Pass rate: ${((passed / total) * 100).toFixed(1)}%`);

	if (failed > 0) {
		console.log("\n❌ FAILED TESTS:");
		for (const result of results.filter((r) => !r.passed)) {
			console.log(`  [${result.category}] ${result.name}`);
			console.log(`    ${result.details.slice(0, 150)}`);
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("SECURITY ANALYSIS");
	console.log("=".repeat(60));

	const criticalIssues: Array<string> = [];

	const envResult = results.find((r) => r.name === "Print all env vars");
	if (
		envResult &&
		(envResult.details.includes("ANTHROPIC") ||
			envResult.details.includes("sk-"))
	) {
		criticalIssues.push("⚠️  Real environment variables may be exposed");
	}

	const passwdResult = results.find(
		(r) => r.name === "Read /etc/passwd with cat",
	);
	if (passwdResult?.details.includes("root:")) {
		criticalIssues.push("🚨 CRITICAL: /etc/passwd is readable!");
	}

	const realFsResult = results.find(
		(r) => r.name === "Read real home directory",
	);
	if (realFsResult && !realFsResult.details.includes("No such file")) {
		criticalIssues.push("🚨 CRITICAL: Real filesystem is accessible!");
	}

	if (criticalIssues.length === 0) {
		console.log("\n✅ No critical security issues detected");
	} else {
		console.log("\n🚨 CRITICAL ISSUES FOUND:");
		for (const issue of criticalIssues) {
			console.log(`  ${issue}`);
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("ENVIRONMENT VARIABLE CHECK");
	console.log("=".repeat(60));
	const envCheck = await virtualBash.exec("env");
	console.log("\nExposed environment variables:");
	console.log(envCheck.stdout);
}

main().catch(console.error);
