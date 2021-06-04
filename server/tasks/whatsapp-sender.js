const puppeteer = require('puppeteer');
const fs = require('fs');

async function run({ message, recipients }, task) {

    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Comenzando.')

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36');


    page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept()
    });

    try {
        await page.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle0',
            timeout: 120000
        })


        qr_code = await page.$eval('._3jid7', el => el.getAttribute('data-ref'))

        task.log(`TOKEN ${qr_code}`)

        await page.waitForSelector('#side', {
            timeout: 120000
        })

        task.setStatus(task.states.RUNNING)
        task.log('Comenzando envío...')

        await page.waitForTimeout(1000)

        for (let [index, number] of recipients.entries()) {
            if (!number) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número inválido`)
                continue
            }

            if (hasSent(number)) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número repetido: ${number}`)
                continue
            }

            if (task.socket.readyState != 1)
                throw Error('Abortado')
            var url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(message)}`
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 120000
            })
            // await page.waitForFunction(`!document.querySelector('progress')`, { timeout: 180000 })
            await page.waitForSelector('#side', { timeout: 180000 })
            await page.waitForTimeout(1000)

            // var invalidNumber = await page.$('._1dwBj._3xWLK')
            var invalidNumber = await page.$('.overlay._1814Z')


            if (invalidNumber) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número sin whatsapp: ${number}`)
                updateData(number, 'Sin whatsapp')
                continue
            }

            await page.click('button._1E0Oz')
            task.setProgress((index + 1) / recipients.length)
            task.log(`[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`)
            updateData(number)
            await page.waitForTimeout(1000)
            await page.waitForFunction(
                `document.querySelectorAll("._2nWgr > span")[document.querySelectorAll("._2nWgr > span").length-1].getAttribute('data-icon')!='msg-time'`
                , { timeout: 120000 }
            );
            // Borra el contenido por si acaso
            await page.click('._2A8P4')
            for (let _ of message) {
                await page.keyboard.press('Backspace');
            }
        }

    }
    catch (e) {
        await page.screenshot({
            path: `data/${Date.now()}.png`,
            fullPage: true
          });
            console.log("Error! ", e);
    }
    await browser.close();
    return 'Completado!'
}


function updateData(number, error) {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    data[number] = {
        timestamp: Date.now(),
        error    }
    fs.writeFileSync('data/logs.json', JSON.stringify(data), 'utf-8');
}

function hasSent(number) {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    return !!data[number]
}

module.exports = {
    run
}

