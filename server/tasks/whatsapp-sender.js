const puppeteer = require("puppeteer");
const fs = require("fs");
const { uniq } = require("lodash");

let browser;

async function run({ message, recipients: _recipients, attachImage }, task) {
  if (!message || !_recipients || !_recipients.length) return "";

  task.log("Comenzando.");
  task.log(attachImage);

  browser = await puppeteer.launch({
    headless: false,
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
    await page.goto("https://web.whatsapp.com");

    const qr = 'div[data-testid="qrcode"]';
    await page.waitForSelector(qr);

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
        await page.waitForTimeout(500);
      } catch (e) {
        isAuthorized = true;
      }
    }

    // CODIGO QR

    // const qr_base64 = await page.screenshot({
    //     clip: {
    //         x: canvasPosition.left,
    //         y: canvasPosition.top,
    //         width: 264,
    //         height: 264
    //     },
    //     type: 'jpeg',
    //     encoding: 'base64',
    //     quality: 100
    // })

    // task.log(`TOKEN ${qrCode}`)
    await page.waitForSelector("#side", {
      timeout: 120000,
    });

    task.setStatus(task.states.RUNNING);
    task.log("Comenzando envío...");
    const recipients = removeRepeatedNumbers(_recipients);

    for (let [index, number] of recipients.entries()) {
      if (task.socket.readyState != 1) throw Error("Abortado");

      const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(
        message
      )}`;
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForSelector("#side");

        let isInvalidNumber = false;
        try {
          await page.waitForSelector("div[data-testid='compose-box']", {
            timeout: 2000,
          });
        } catch (e) {
          await page
            .$eval(
              "div[data-testid='popup-contents']",
              (el) => (el ? el.textContent : ""),
              { timeout: 3000 }
            )
            .then((text) => (isInvalidNumber = text.includes("inválido")))
            .catch();
        }

        if (isInvalidNumber) {
          task.setProgress((index + 1) / recipients.length);
          task.log(
            `[${index + 1}/${recipients.length}] Número inválido: ${number}`
          );
          updateData(number, "invalid");
          continue;
        }

        // ADJUNTAR IMAGEN
        if (attachImage) {
          const clipButton = 'div[title="Adjuntar"]';
          await page.waitForSelector(clipButton, { timeout: 5000 });
          const imageButton = 'li[data-testid="mi-attach-media"]';

          for (let i = 0; i < 5; i++) {
            try {
              await page.click(clipButton);
              await page.waitForTimeout(500);
              await page.waitForSelector(imageButton, { timeout: 2000 });
              await page.waitForTimeout(500);
              break;
            } catch (e) {
              continue;
            }
          }
          const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click(imageButton),
          ]);
          await fileChooser.accept(["data/imagen.png"]);
          await page.waitForSelector(".konvajs-content");
          await page.waitForSelector('div[aria-label="Enviar"]');
          page.click('div[aria-label="Enviar"]');
          await page.waitForTimeout(1000);
        } else {
          const sendButton = 'button[aria-label="Enviar"]';
          for (let i = 0; i < 5; i++) {
            try {
              console.log("intento N°", i + 1);
              await page.waitForSelector(sendButton, { timeout: 2000 });
              await page.click(sendButton);
              await page.waitForTimeout(500);
            } catch (e) {
              break;
            }
          }
        }

        await page.waitForFunction(
          () => {
            const icons = document.querySelectorAll(
              'div[data-testid="msg-meta"] span[data-testid^="msg-"]'
            );
            if (!icons) return false;
            const currLength = icons.length;
            if (currLength) {
              return (
                icons[currLength - 1].getAttribute("data-icon") != "msg-time"
              );
            }
            return false;
          },
          { timeout: 5000 }
        );

        task.setProgress((index + 1) / recipients.length);
        task.log(
          `[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`
        );
        updateData(number);
      } catch (err) {
        task.log(err);
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

function removeRepeatedNumbers(numbers) {
  try {
    const data = JSON.parse(fs.readFileSync("data/logs.json", "utf-8"));
    const filtered = uniq(numbers.filter((number) => !number || !data[number]));
    return filtered;
  } catch {
    return numbers;
  }
}

module.exports = {
  run,
};
