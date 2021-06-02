const puppeteer = require('puppeteer');


async function run({ message, recipients }, task) {
    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Comenzando.')
 
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36');
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
        if(!number){
            task.setProgress((index + 1) / recipients.length)
            task.log(`[${index + 1}/${recipients.length}] Número inválido`)
            continue
        }

        if (task.socket.readyState != 1)
            throw Error('Abortado')
        var url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURI(message)}`
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 120000
        })
        await page.waitForSelector('#side', {timeout: 120000})
        await page.waitForTimeout(1000)

        var invalidNumber = await page.$('._1dwBj._3xWLK')

        if (invalidNumber) {
            task.setProgress((index + 1) / recipients.length)
            task.log(`[${index + 1}/${recipients.length}] Número sin whatsapp: ${number}`)
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