const puppeteer = require('puppeteer');
const fs = require('fs');

let browser

async function run({ message, recipients, attachImage }, task) {

    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Comenzando.')
    task.log(attachImage)

    browser = await puppeteer.launch({
        headless: false,
        args: [
            '--start-maximized',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-sandbox',
            '--no-zygote',
        ],
        defaultViewport: null
    });
    const page = await browser.newPage();

    page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept()
    });

    try {
        await page.goto('https://web.whatsapp.com')

        // ESPERAR HASTA QUE APAREZCA EL CODIGO (a veces se apuraba y tomaba un token null)
        const qr = 'div[data-testid="qrcode"]'
        await page.waitForSelector(qr)
        console.log('QR visible');

        // el componente vue-qr dibujaba otro patrón y desde algunos celulares no funcionaba la lectura. Se optó por screenshotear el navegador y pasar la imagen directo a la app.
        const qrCode = await page.$eval(qr, el => el ? el.getAttribute('data-ref') : '')
        task.log(`TOKEN ${qrCode}`)

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
        await page.waitForSelector('#side')

        task.setStatus(task.states.RUNNING)
        task.log('Comenzando envío...')

        for (let [index, number] of recipients.entries()) {
            if (!number) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número inválido`)
                continue
            }

            if (hasSent(number)) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número repetido: ${number}`)
                return null
                // continue
            }

            if (task.socket.readyState != 1)
                throw Error('Abortado')

            const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(message)}`
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                })
                await page.waitForSelector('#side')

                let isInvalidNumber
                try {
                    await page.waitForSelector('._3J6wB', { timeout: 2000 })
                    const text = await page.$eval('._2Nr6U', (el) => el ? el.textContent : '')
                    isInvalidNumber = text.includes('inválido')
                } catch (e) {
                    isInvalidNumber = false
                }

                if (isInvalidNumber) {
                    task.setProgress((index + 1) / recipients.length)
                    task.log(`[${index + 1}/${recipients.length}] Número inválido: ${number}`)
                    updateData(number, 'Inválido')
                    return null
                }

                // ADJUNTAR IMAGEN
                if (attachImage) {
                    const clipButton = 'div[aria-label="Adjuntar"] span[data-testid="clip"]'
                    await page.waitForSelector(clipButton, { timeout: 10000 });
                    await page.waitForTimeout(1000);
                    await page.click(clipButton);
                    await page.waitForTimeout(1000);

                    const imageButton = 'button[aria-label="Fotos y videos"]';
                    await page.waitForSelector(imageButton, { timeout: 5000 });

                    const [fileChooser] = await Promise.all([
                        page.waitForFileChooser(),
                        page.click(imageButton),
                    ]);
                    await fileChooser.accept(['data/imagen.png']);
                    await page.waitForSelector('.konvajs-content');
                    await page.waitForSelector('div[aria-label="Enviar"]')
                    page.click('div[aria-label="Enviar"]');
                    await page.waitForTimeout(1000);
                }

                else {
                    const sendButton = 'button[aria-label="Enviar"]'
                    await page.waitForSelector(sendButton, { timeout: 5000 })
                    await page.click(sendButton)
                    await page.waitForTimeout(500);
                }
                console.log('Mensaje enviado');

                await page.waitForFunction(
                    () => {
                        const icons = document.querySelectorAll('div[data-testid="msg-meta"] span[data-testid^="msg-"]');
                        if (!icons)
                            return false
                        const currLength = icons.length
                        if (currLength) {
                            return (icons[currLength - 1].getAttribute('data-icon') != 'msg-time')
                        }
                        return false
                    }
                    , { timeout: 10000 }
                );

                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`)
                updateData(number);

            } catch (err) {
                task.log(err);
                continue
            }
        }

    }
    catch (e) {
        console.log("Error! ", e);
    }

    await browser.close();
    return 'Completado!'

}


function updateData(number, error) {
    try {
        const data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
        data[number] = {
            timestamp: Date.now(),
            error
        }
        fs.writeFileSync('data/logs.json', JSON.stringify(data), 'utf-8');

    } catch {
        const data = {
            [number]: {
                timestamp: Date.now(),
                error
            }
        }
        fs.writeFileSync('data/logs.json', JSON.stringify(data), 'utf-8');
    }

}

function hasSent(number) {
    try {
        const data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
        return !!data[number]
    } catch {
        return false
    }
}

module.exports = {
    run
}
