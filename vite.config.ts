import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Workers AI はローカルで動かないので、開発時は既定でリモートバインディングを切る。
 * `bun run dev:ai`（NIOU_REMOTE_AI=1）で Cloudflare にログイン済みなら本物の AI を使える。
 */
const remoteBindings = process.env.NIOU_REMOTE_AI === "1";

export default defineConfig({
	plugins: [react(), cloudflare({ remoteBindings })],
});
