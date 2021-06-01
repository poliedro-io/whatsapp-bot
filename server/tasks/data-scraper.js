const puppeteer = require('puppeteer')
const fs = require('fs');
const chunk = require('lodash/chunk');
const flatten = require('lodash/flatten');

const url = 'https://www.google.cl/maps/'

async function run({ keyWords, cities }, task) {
    if (!keyWords.length || !cities.length)
        return ''

    let searchTerms = flatten(keyWords.map(kw => 
        cities.map(c => `${kw}, ${c}` )
    ))

    console.log(searchTerms)

    const browser = await puppeteer.launch();
    const page = await browser.newPage();


    let allItems = []

    const batches = chunk(searchTerms, 10)
    task.setStatus(task.states.RUNNING)
    task.log('Comenzando obtención de datos...')

    for(let i = 0; i < batches.length; i++){
        let items = await runBatch(browser, batches[i])
        allItems = allItems.concat(items)
        task.setProgress((i + 1) / batches.length)
        task.log(`${allItems.length} datos obtenidos.`)
    }

    await page.waitForTimeout(1000)

    await browser.close();

    const jsonString = JSON.stringify(allItems)
    fs.writeFile('data/data.json', jsonString, err => {
        if (err) {
            console.log('Hubo un error en la creación del archivo: ', err)
        } else {
            console.log('Archivo creado con éxito.')
        }
    })

    return 'Completado!'

}

module.exports = {
    run
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(() => resolve(), time));
}

function runBatch(browser, batch) {
    return Promise.all(batch.map((term) =>
        runByTerm(browser, term)
    )).then(arrays => arrays.reduce((acc, arr) => arr ? [...acc, ...arr] : acc, []))
}

async function runByTerm(browser, term) {
    try {
        const page = await browser.newPage()
        await page.goto(url, {
            waitUntil: 'networkidle0',
        })
        await page.waitForSelector('.tactile-searchbox-input');
        await page.$eval('.tactile-searchbox-input', (el, term) => el.value = term, term);
        await page.click('#searchbox-searchbutton');
        await page.screenshot({path: 'screenshot.png'});
        await page.waitForSelector(`div[aria-label="Resultados de ${term}`);

        let items = []

        async function getCurrentItems() {
            const currentPage = await page.evaluate(async (term) => {
                const sleep = (time) => {
                    return new Promise(resolve => setTimeout(() => resolve(), time));
                }
                const element = document.querySelector(`div[aria-label="Resultados de ${term}`);

                for (let i = 0; i < 3; i++) {
                    element.scroll(0, element.scrollHeight);
                    await sleep(1000)
                }

                const cards = [...document.querySelectorAll('.MVVflb-haAclf.V0h1Ob-haAclf-d6wfac.MVVflb-haAclf-uxVfW-hSRGPd')];

                return cards.map(el => {
                    let infoElements = el.getElementsByTagName('jsl')
                    let phone = infoElements.item(infoElements.length - 1).textContent
                    return {
                        term,
                        name: el.getAttribute('aria-label').toUpperCase(),
                        phone: phone.match(/[A-z]/gi) ? '' : phone.replace('·', '').trim()
                    }
                }).filter(el => el.phone)
            }, term)
            return currentPage
        }

        let isNextable = true
        let disabledAttr
        let index = 0

        do {
            index++
            disabledAttr = await page.$eval('button[aria-label="Página siguiente"]', el => el.getAttribute('disabled'))
            isNextable = disabledAttr ? false : true
            currentItems = await getCurrentItems()
            items = items.concat(currentItems)

            try {
                await page.click('button[aria-label="Página siguiente"]');
            } catch (err) {
                console.log('No hay más resultados.')
                break
                // este error es porque hay que hacer un zoomout al mapa para mostrar todos los resultados (haciendo click en el boton '-' del mapa)
            }
            await sleep(3000)
        } while (isNextable)

        await page.close()
        return items

    } catch (error) {
        console.error(error)
    }
}
