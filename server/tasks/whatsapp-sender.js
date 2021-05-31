const puppeteer = require('puppeteer');


async function run({ message, recipients }, task) {
    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Comenzando.')
    // await new Promise(resolve => {
    //     setTimeout(function () {
    //         resolve()
    //     }, 2000);
    // })
    // task.setStatus(task.states.RUNNING)
    // task.log('Comenzando a enviar')

    // for (let index = 0; index < recipients.length; index++) {
    //     let res = await sendMessage(recipients[index], index + 1, recipients.length)

    //     if (task.socket.readyState != 1)
    //         throw Error('Abortado')
    //     task.setProgress((index + 1) / recipients.length)
    //     task.log(res)
    // }

    // return Promise.resolve('Completado!')

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36');
    await page.goto('https://web.whatsapp.com', {
        waitUntil: 'networkidle0',
    })


    qr_code = await page.$eval('._3jid7', el => el.getAttribute('data-ref'))

    // await browser.close();
    task.log(`TOKEN ${qr_code}`)

    await page.waitForSelector('#side')

    task.setStatus(task.states.RUNNING)
    task.log('Comenzando envío...')

    await page.waitForTimeout(1000)

    for (let index = 0; index < recipients.length; index++) {
        if (task.socket.readyState != 1)
            throw Error('Abortado')
        var url = `https://web.whatsapp.com/send?phone=${recipients[index]}&text=${encodeURI(message)}`
        await page.goto(url, {
            waitUntil: 'networkidle0',
        })
        await page.waitForSelector('#side')
        await page.waitForTimeout(1000)

        var invalidNumber = await page.$('._1dwBj._3xWLK')

        if (invalidNumber) {
            task.setProgress((index + 1) / recipients.length)
            task.log(`[${index + 1}/${recipients.length}] Número inválido ${recipients[index]}`)
            continue
        }

        await page.$eval('button._1E0Oz', el => el.click())
        task.setProgress((index + 1) / recipients.length)
        task.log(`[${index + 1}/${recipients.length}] Mensaje enviado a ${recipients[index]}`)
        await page.waitForTimeout(1000)
    }


    await browser.close();
    return 'Completado!'

}

module.exports = {
    run
}