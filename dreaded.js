const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");
const chalk = require("chalk");
const figlet = require("figlet");

async function startBot() {
  console.log(
    chalk.cyan(
      figlet.textSync("LARIMAR BOT", {
        font: "Standard",
        horizontalLayout: "default",
      }),
    ),
  );

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    browser: ["LarimarBot", "Chrome", "1.0.0"],
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log(
        chalk.cyan(`
╔══════════════════════════════════════════╗
║        🌊  SCAN LARIMARBOT QR  🌊        ║
╚══════════════════════════════════════════╝
`),
      );

      console.log(chalk.cyan("Scan this QR code:\n"));
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log(chalk.green("🌊 LarimarBot connected successfully!"));
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect =
        reason !== DisconnectReason.loggedOut &&
        reason !== 401 &&
        reason !== 403;

      if (shouldReconnect) {
        console.log(chalk.yellow("Reconnecting..."));
        setTimeout(() => startBot(), 2000);
      } else {
        console.log(
          chalk.red("Logged out. Delete session folder and restart."),
        );
        process.exit();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const sender = msg.key.remoteJid;
    const text =
      msg.message.conversation || msg.message.extendedTextMessage?.text || null;

    console.log(chalk.blue(`Message from ${sender}: ${text}`));

    if (!text) return;

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(sender, {
        text: "Hello! 🌊 LarimarBot is online.",
      });
    }
  });
}

startBot();
