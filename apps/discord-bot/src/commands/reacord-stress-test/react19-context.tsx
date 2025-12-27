import {
	ActionRow,
	Button,
	Container,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { createContext, use, useCallback, useState } from "react";

type Theme = "light" | "dark" | "system";
type Locale = "en" | "es" | "fr" | "de";

interface Settings {
	theme: Theme;
	locale: Locale;
	notifications: boolean;
	compactMode: boolean;
}

interface SettingsContextValue {
	settings: Settings;
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	resetSettings: () => void;
}

const defaultSettings: Settings = {
	theme: "system",
	locale: "en",
	notifications: true,
	compactMode: false,
};

const SettingsContext = createContext<SettingsContextValue>({
	settings: defaultSettings,
	updateSetting: () => {},
	resetSettings: () => {},
});

const THEME_COLORS: Record<Theme, number> = {
	light: 0xffffff,
	dark: 0x2f3136,
	system: 0x5865f2,
};

const LOCALE_NAMES: Record<Locale, string> = {
	en: "English",
	es: "Español",
	fr: "Français",
	de: "Deutsch",
};

function ThemeDisplay() {
	const { settings } = use(SettingsContext);

	return (
		<Container accentColor={THEME_COLORS[settings.theme]}>
			<TextDisplay>
				### Current Theme: {settings.theme.toUpperCase()}
			</TextDisplay>
			<TextDisplay>
				{settings.theme === "light" && "☀️ Bright and clean interface"}
				{settings.theme === "dark" && "🌙 Easy on the eyes"}
				{settings.theme === "system" && "🖥️ Follows your system preference"}
			</TextDisplay>
		</Container>
	);
}

function LocaleDisplay() {
	const { settings } = use(SettingsContext);

	const greetings: Record<Locale, string> = {
		en: "Hello! Welcome to the settings panel.",
		es: "¡Hola! Bienvenido al panel de configuración.",
		fr: "Bonjour! Bienvenue dans le panneau de paramètres.",
		de: "Hallo! Willkommen im Einstellungsbereich.",
	};

	return (
		<Container accentColor={0x57f287}>
			<TextDisplay>### Language: {LOCALE_NAMES[settings.locale]}</TextDisplay>
			<TextDisplay>_{greetings[settings.locale]}_</TextDisplay>
		</Container>
	);
}

function NotificationStatus() {
	const { settings } = use(SettingsContext);

	return (
		<Container accentColor={settings.notifications ? 0x57f287 : 0xed4245}>
			<TextDisplay>
				### Notifications: {settings.notifications ? "ON" : "OFF"}
			</TextDisplay>
			<TextDisplay>
				{settings.notifications
					? "🔔 You will receive all notifications"
					: "🔕 Notifications are muted"}
			</TextDisplay>
		</Container>
	);
}

function SettingsSummary() {
	const { settings } = use(SettingsContext);

	return (
		<Container accentColor={0x99aab5}>
			<TextDisplay>### Settings Summary</TextDisplay>
			<TextDisplay>**Theme:** {settings.theme}</TextDisplay>
			<TextDisplay>**Language:** {LOCALE_NAMES[settings.locale]}</TextDisplay>
			<TextDisplay>
				**Notifications:** {settings.notifications ? "Enabled" : "Disabled"}
			</TextDisplay>
			<TextDisplay>
				**Compact Mode:** {settings.compactMode ? "Enabled" : "Disabled"}
			</TextDisplay>
		</Container>
	);
}

function SettingsControls() {
	const { settings, updateSetting, resetSettings } = use(SettingsContext);
	const instance = useInstance();

	return (
		<>
			<Select
				placeholder="Select Theme"
				value={settings.theme}
				onSelect={(value) => updateSetting("theme", value as Theme)}
			>
				<Option value="light" label="Light" description="Bright theme" />
				<Option value="dark" label="Dark" description="Dark theme" />
				<Option value="system" label="System" description="Match system" />
			</Select>

			<Select
				placeholder="Select Language"
				value={settings.locale}
				onSelect={(value) => updateSetting("locale", value as Locale)}
			>
				<Option value="en" label="English" />
				<Option value="es" label="Español" />
				<Option value="fr" label="Français" />
				<Option value="de" label="Deutsch" />
			</Select>

			<ActionRow>
				<Button
					label={
						settings.notifications
							? "🔔 Notifications On"
							: "🔕 Notifications Off"
					}
					style={settings.notifications ? "success" : "secondary"}
					onClick={() =>
						updateSetting("notifications", !settings.notifications)
					}
				/>
				<Button
					label={settings.compactMode ? "Compact: On" : "Compact: Off"}
					style={settings.compactMode ? "success" : "secondary"}
					onClick={() => updateSetting("compactMode", !settings.compactMode)}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label="Reset to Defaults"
					style="secondary"
					onClick={resetSettings}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}

export function React19ContextScenario() {
	const [settings, setSettings] = useState<Settings>(defaultSettings);

	const updateSetting = useCallback(
		<K extends keyof Settings>(key: K, value: Settings[K]) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const resetSettings = useCallback(() => {
		setSettings(defaultSettings);
	}, []);

	const contextValue: SettingsContextValue = {
		settings,
		updateSetting,
		resetSettings,
	};

	return (
		<SettingsContext value={contextValue}>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: Context as Provider + use() Hook</TextDisplay>
				<TextDisplay>
					React 19 allows using `{"<Context>"}` directly as a provider (no
					`.Provider` needed) and the `use()` hook to read context in render.
				</TextDisplay>
			</Container>

			<Separator />

			<ThemeDisplay />
			<LocaleDisplay />
			<NotificationStatus />

			<Separator />

			<SettingsSummary />

			<Separator />

			<SettingsControls />
		</SettingsContext>
	);
}
