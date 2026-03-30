import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { uniq } from "lodash-es";

const USER_DATA_DIR = path.resolve("data/chrome-session");

let browser;

export async function run({ message, recipients: _recipients, attachImage, imagePath }, task) {
  if (!message || !_recipients || !_recipients.length) return "";

  task.log("Comenzando.");

  // Clean stale lock files from previous crashed sessions
  for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try { fs.unlinkSync(path.join(USER_DATA_DIR, lock)); } catch {}
  }

  browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
    args: [
      "--start-maximized",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-sandbox",
      "--no-zygote",
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  try {
    const recipients = removeRepeatedNumbers(_recipients);
    const skipped = _recipients.length - recipients.length;

    if (!recipients.length) {
      task.log("No hay destinatarios nuevos. Usa 'Limpiar registro' para reenviar.");
      await browser.close();
      task.setStatus(task.states.RUNNING);
      return "Completado!";
    }

    // Navigate directly to the first recipient (avoids double load)
    const firstUrl = attachImage
      ? `https://web.whatsapp.com/send?phone=${recipients[0]}`
      : `https://web.whatsapp.com/send?phone=${recipients[0]}&text=${encodeURI(message)}`;

    await page.goto(firstUrl);

    // Check if already logged in or need QR scan
    const sideOrQr = await Promise.race([
      page.waitForSelector("#side", { timeout: 60000 }).then(() => "side"),
      page.waitForSelector("canvas[aria-label]", { timeout: 60000 }).then(() => "qr"),
      page.waitForSelector("div._19vUU", { timeout: 60000 }).then(() => "qr"),
    ]);

    if (sideOrQr === "qr") {
      task.log("Escanea el codigo QR...");
      const qr = "div._19vUU";
      let isAuthorized = false;
      let token = "";
      while (!isAuthorized) {
        try {
          await page.waitForSelector(qr, { timeout: 1000 });
          const newToken = await page.$eval(qr, (el) =>
            el ? el.getAttribute("data-ref") : ""
          );
          if (newToken !== token) {
            token = newToken;
            task.log(`TOKEN ${token}`);
          }
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          isAuthorized = true;
        }
      }
    } else {
      task.log("Sesion activa, sin necesidad de QR.");
    }

    await page.waitForSelector("#side", { timeout: 120000 });

    task.setStatus(task.states.RUNNING);
    if (skipped > 0) {
      task.log(`${skipped} numero(s) omitido(s) (ya enviados anteriormente).`);
    }
    task.log(`Comenzando envio a ${recipients.length} destinatario(s)...`);

    for (let [index, number] of recipients.entries()) {
      if (task.socket.readyState != 1) throw Error("Abortado");

      try {
        // First recipient: already navigated, just wait for chat
        // Subsequent: navigate via JS (no full reload)
        if (index > 0) {
          const sendUrl = attachImage
            ? `https://web.whatsapp.com/send?phone=${number}`
            : `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(message)}`;

          await page.evaluate((url) => {
            window.location.href = url;
          }, sendUrl);
        }

        // Wait for chat to load
        await page.waitForSelector("#side", { timeout: 15000 });

        let isInvalidNumber = false;
        try {
          await page.waitForSelector("div[id='main']", { timeout: 8000 });
        } catch {
          try {
            await page.waitForSelector("div[role='dialog']", {
              timeout: 3000,
              hidden: true,
            });
          } catch {
            isInvalidNumber = true;
          }
        }

        if (isInvalidNumber) {
          task.setProgress((index + 1) / recipients.length);
          task.log(
            `[${index + 1}/${recipients.length}] Numero invalido: ${number}`
          );
          updateData(number, "invalid");
          continue;
        }

        if (attachImage) {
          // 1. Upload and send image
          const fileInput = await page.$('input[type="file"][accept="image/*"]');
          if (!fileInput) throw new Error("No se encontro el input de imagen");
          await fileInput.uploadFile(imagePath || "data/imagen.png");
          await new Promise((r) => setTimeout(r, 2000));

          const previewSend = 'div[aria-label="Enviar"][role="button"]';
          await page.waitForSelector(previewSend, { timeout: 5000 });
          await page.click(previewSend);
          await new Promise((r) => setTimeout(r, 2000));

          // 2. Then send the text message
          await typeAndSend(page, message);
        } else {
          // Message is pre-filled via URL, just click send
          const sendButton = 'button[aria-label="Enviar"]';
          await page.waitForSelector(sendButton, { timeout: 5000 });
          await page.click(sendButton);
        }

        await new Promise((r) => setTimeout(r, 1500));

        task.setProgress((index + 1) / recipients.length);
        task.log(
          `[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`
        );
        updateData(number);
      } catch (err) {
        task.setProgress((index + 1) / recipients.length);
        task.log(
          `[${index + 1}/${recipients.length}] Error con ${number}: ${err.message || err}`
        );
        continue;
      }
    }
  } catch (e) {
    console.log("Error! ", e);
  }

  await browser.close();
  return "Completado!";
}

function updateData(number, error) {
  try {
    let data = JSON.parse(fs.readFileSync("data/logs.json", "utf-8"));
    data = data || {};
    data[number] = {
      timestamp: Date.now(),
      error,
    };
    fs.writeFileSync("data/logs.json", JSON.stringify(data), "utf-8");
  } catch {
    console.error("Error updating logs");
  }
}

async function typeAndSend(page, message) {
  const msgInput = 'div[contenteditable="true"][data-tab="10"]';
  await page.waitForSelector(msgInput, { timeout: 5000 });
  await page.click(msgInput);

  // Clear any existing text first
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await new Promise((r) => setTimeout(r, 200));

  // Paste message via clipboard (preserves *bold*, _italic_ formatting)
  await page.evaluate((text) => {
    const input = document.querySelector('div[contenteditable="true"][data-tab="10"]');
    if (input) {
      input.focus();
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      input.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }));
    }
  }, message);

  await new Promise((r) => setTimeout(r, 300));

  const sendButton = 'button[aria-label="Enviar"]';
  await page.waitForSelector(sendButton, { timeout: 3000 });
  await page.click(sendButton);
}

function removeRepeatedNumbers(numbers) {
  try {
    const data = JSON.parse(fs.readFileSync("data/logs.json", "utf-8"));
    const filtered = uniq(numbers.filter((number) => !data[number]));
    return filtered;
  } catch {
    return numbers.map((n) => n.trim().replace("+", ""));
  }
}
