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
            timeout: 120000,
        })

        // ESPERAR HASTA QUE APAREZCA EL CODIGO (a veces se apuraba y tomaba un token null)
        await page.waitForSelector('.b77wc', {
            visible: true,
            timeout: 120000
        })
        
        // CODIGO QR
        const qr_code = await page.$eval('._2UwZ_', el => el.getAttribute('data-ref'))

        task.log(`TOKEN ${qr_code}`)

        await page.waitForSelector('#side', {
            visible: true,
            timeout: 120000
        })
        // await page.waitForTimeout(5000)


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
            // await page.waitForFunction(`!document.querySelector('progress')`, { timeout: 180000 })
            try {
                await page.waitForSelector('#side', { timeout: 180000 })
            } catch (err) {
                console.log('Error: no cargó la página')
                continue
            }

            // await page.waitForTimeout(1000)

            const invalidNumber = await page.$('._3J6wB') // MODAL NUMERO INVALIDO

            if (invalidNumber) {
                task.setProgress((index + 1) / recipients.length)
                task.log(`[${index + 1}/${recipients.length}] Número sin whatsapp: ${number}`)
                updateData(number, 'Sin whatsapp')
                continue
            }

            await page.click('button._4sWnG')  // BOTON ENVIAR MENSAJE
            task.setProgress((index + 1) / recipients.length)
            task.log(`[${index + 1}/${recipients.length}] Mensaje enviado a ${number}`)
            updateData(number)

            // await page.waitForTimeout(1000)

            await page.waitForFunction(
                `document.querySelectorAll(".do8e0lj9>span")[document.querySelectorAll(".do8e0lj9>span").length-1].getAttribute('data-icon')!='msg-time'`
                , { timeout: 120000 }
            );


            // Borra el contenido por si acaso
            // no es necesario porque al enviar se borra el mensaje automaticamente
            // await page.click('._13NKt')    // BARRA DE TEXTO
            // // eslint-disable-next-line no-unused-vars
            // for (let _ of message) {
            //     await page.keyboard.press('Backspace');
            // }
        }

    }
    catch (e) {
        // await page.screenshot({
        //     path: `data/${Date.now()}.jpg`,
        //     fullPage: true,
        //     type: "jpeg"
        // });
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

