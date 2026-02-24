import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const CONFIG_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/config.ts",
);

async function getErogeModeFromConfig() {
	try {
		const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
		const match = configContent.match(
			/eroge:\s*\{[\s\S]*?mode:\s*["']([^"']+)["']/,
		);

		if (match && match[1]) {
			return match[1];
		}
		return "local";
	} catch (error) {
		return "local";
	}
}

function runScript(scriptPath) {
	return new Promise((resolve, reject) => {
		const script = spawn("node", [scriptPath], {
			stdio: "inherit",
			shell: true,
		});

		script.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Script exited with code ${code}`));
			}
		});

		script.on("error", (err) => {
			reject(err);
		});
	});
}

async function main() {
	const mode = await getErogeModeFromConfig();
	const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

	if (mode === "bangumi") {
		console.log(
			"Detected eroge mode: bangumi, running update-eroge-bangumi.mjs",
		);
		await runScript(path.join(scriptsDir, "update-eroge-bangumi.mjs"));
	} else if (mode === "local") {
		console.log('Detected eroge mode: local, skipping remote data update.');
	} else {
		console.log(`Eroge mode is "${mode}", skipping data update.`);
	}
}

main().catch((err) => {
	console.error("\n✘ Script execution error:");
	console.error(err);
	process.exit(1);
});
