import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 加载 .env 文件。默认不覆盖调用环境中已经存在的变量，避免 CI/Pages
// 面板配置被本地 .env 意外覆盖。
export function loadEnv({ override = false } = {}) {
	const envPath = path.join(rootDir, ".env");
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, "utf-8");
		envContent.split("\n").forEach((line) => {
			const line_ = line.trim();
			// 跳过注释和空行
			if (!line_ || line_.startsWith("#")) return;

			const match = line_.match(/^([^=]+)=(.*)$/);
			if (match) {
				const key = match[1].trim();
				let value = match[2].trim();
				// 移除引号
				value = value.replace(/^["']|["']$/g, "");
				if (!override && process.env[key] !== undefined) return;
				process.env[key] = value;
			}
		});
	}
}
