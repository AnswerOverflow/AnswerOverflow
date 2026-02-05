const PUSHOVER_USER_KEY = process.env.PUSHOVER_USER_KEY;
const PUSHOVER_API_TOKEN = process.env.PUSHOVER_API_TOKEN;

interface AlertPayload {
	testName: string;
	error: string;
	timestamp: string;
	environment?: string;
}

async function sendAlert(payload: AlertPayload): Promise<void> {
	if (!PUSHOVER_USER_KEY || !PUSHOVER_API_TOKEN) {
		console.warn(
			"PUSHOVER_USER_KEY or PUSHOVER_API_TOKEN not set, skipping alert",
		);
		return;
	}

	const message = `${payload.error}\n\nEnvironment: ${payload.environment || "unknown"}\nTime: ${payload.timestamp}`;

	const formData = new FormData();
	formData.append("token", PUSHOVER_API_TOKEN);
	formData.append("user", PUSHOVER_USER_KEY);
	formData.append("title", `🚨 E2E Failed: ${payload.testName}`);
	formData.append("message", message);
	formData.append("priority", "1");
	formData.append("sound", "siren");

	const response = await fetch("https://api.pushover.net/1/messages.json", {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		console.error("Failed to send Pushover alert:", await response.text());
	} else {
		console.log("Pushover alert sent");
	}
}

async function sendSuccessNotification(testName: string): Promise<void> {
	if (
		!PUSHOVER_USER_KEY ||
		!PUSHOVER_API_TOKEN ||
		!process.env.NOTIFY_ON_SUCCESS
	) {
		return;
	}

	const formData = new FormData();
	formData.append("token", PUSHOVER_API_TOKEN);
	formData.append("user", PUSHOVER_USER_KEY);
	formData.append("title", `✅ E2E Passed: ${testName}`);
	formData.append("message", `Tests passed at ${new Date().toISOString()}`);
	formData.append("priority", "-1");

	await fetch("https://api.pushover.net/1/messages.json", {
		method: "POST",
		body: formData,
	});
}

export { sendAlert, sendSuccessNotification };
