const puppeteer = require('puppeteer');
const fs = require('fs');

let browser

async function run({ message, recipients }, task) {

    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Comenzando.')

    browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-fullscreen'
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36');
    // await page.setViewport({ width: 1024, height: 768});

    page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept()
    });

    try {
        await page.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle0',
            timeout: 120000,
        })

        // ESPERAR HASTA QUE APAREZCA EL CODIGO (a veces se apuraba y tomaba un token null)
        await page.waitForSelector('.b77wc', {
            visible: true,
            timeout: 120000
        })

        // el componente vue-qr dibujaba otro patrón y desde algunos celulares no funcionaba la lectura. Se optó por screenshotear el navegador y pasar la imagen directo a la app.
        const qr_code = await page.$eval('._2UwZ_', el => el ? el.getAttribute('data-ref') : '')
        task.log(`TOKEN ${qr_code}`)

        // CODIGO QR

        // const canvasPosition = await page.$eval('canvas', el => {
        //     const { left, top } = el.getBoundingClientRect()
        //     return { left, top }
        // })

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

        task.log(`TOKEN ${qr_code}`)

        await page.waitForSelector('#side', {
            visible: true,
            timeout: 120000
        })

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
                continue
            }

            if (task.socket.readyState != 1)
                throw Error('Abortado')

            var url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(message)}`
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 120000
            })

            try {
                await page.waitForSelector('#side', { timeout: 180000 })
            } catch (err) {
                console.log('Error: no cargó la página')
                continue
            }

            const dialog = await page.$('._2Nr6U')
            const text = await page.evaluate(el =>  el ? el.textContent : '', dialog)
            const isInvalidNumber = text.includes('inválido') 

            if (isInvalidNumber) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número inválido: ${number}`)
                updateData(number, 'Inválido')
                continue
            }

            try{
                await page.waitForSelector('button._4sWnG', { timeout: 30000 })
                await page.waitForTimeout(500);
                await page.click('button._4sWnG')  // BOTON ENVIAR MENSAJE
                await page.waitForTimeout(500);
                await page.waitForFunction(
                    () => {
                        const icons = document.querySelectorAll(".do8e0lj9>span");
                        if(!icons)
                            return false
                        const currLength = icons.length
                        if(currLength){
                            return (icons[currLength - 1].getAttribute('data-icon') != 'msg-time')
                        }
                        return false
                    }
                    , { timeout: 120000 }
                );
    
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`)
                updateData(number)
            } catch {
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
