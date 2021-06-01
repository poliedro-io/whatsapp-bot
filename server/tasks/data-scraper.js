const puppeteer = require('puppeteer')
const xlsx = require('xlsx')
const fs = require('fs');
const chunk = require('lodash/chunk');
const flatten = require('lodash/flatten');
const { Agent } = require('http');

const url = 'https://www.google.cl/maps/'

let count = 0

async function run({ keyWords, cities }, task) {
    if (!keyWords.length || !cities.length)
        return ''

    let searchTerms = flatten(keyWords.map(kw =>
        cities.map(c => `${kw}, ${c}`)
    ))

    console.log(searchTerms)

    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    const batches = chunk(searchTerms, 10)
    task.setStatus(task.states.RUNNING)
    task.log('Comenzando obtención de datos...')

    for (let i = 0; i < batches.length; i++) {
        await runBatch(browser, batches[i], task)
        task.setProgress((i + 1) / batches.length)
    }
    task.log(`${count} datos obtenidos.`)

    await page.waitForTimeout(1000)

    await browser.close();

    writeXLSX();

    return 'Completado!'

}

module.exports = {
    run
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(() => resolve(), time));
}

async function runBatch(browser, batch, task) {
    return Promise.all(batch.map((term) =>
        runByTerm(browser, term, task)
    ))
}

async function runByTerm(browser, term, task) {
    try {
        const page = await browser.newPage()
        await page.goto(url)
        await page.waitForSelector('.tactile-searchbox-input');
        await page.type('.tactile-searchbox-input', term)
        await page.click('#searchbox-searchbutton');
        let resultsSelector = `div[aria-label="Resultados de ${term}"]`
        await page.waitForSelector(resultsSelector);

        resetData()

        let isNextable = true
        let disabledAttr

        do {
            // ver si hay mas resultados disponibles
            disabledAttr = await page.$eval('button[aria-label="Página siguiente"]', el => el.getAttribute('disabled'))
            isNextable = disabledAttr ? false : true

            // obtener 20 items (1 pagina)
            let links = await getPageLinks(page, resultsSelector)
            let pageItems = await scrapSinglePage(links, browser)

            // actualizar archivo json
            updateData(pageItems, term)
            count += pageItems.length
            task.log(`${count} registros obtenidos`)

            console.log(count)

            // avanzar página
            try {
                await page.click('button[aria-label="Página siguiente"]');
            } catch (err) {
                console.log('No hay más resultados.')
                break
            }
            await sleep(2000)
        } while (isNextable)

        await page.close()
        return items

    } catch (error) {
        console.error(error)
    }
}

async function scrapSinglePage(links, browser) {
    const items = await Promise.all(links.map(async (link) => {
        const page = await browser.newPage()
        await page.goto(link, {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector('.QSFF4-text.gm2-body-2')
        let telefono, direccion, nombre
        try {
            telefono = await page.$eval('button[aria-label*="Teléfono"] .QSFF4-text.gm2-body-2', el => el.textContent)
        } catch { telefono = null }
        try {
            direccion = await page.$eval('button[aria-label*="Dirección"] .QSFF4-text.gm2-body-2', el => el.textContent)
        } catch { direccion = null }
        try {
            nombre = await page.$eval('.x3AX1-LfntMc-header-title-title.gm2-headline-5 span:first-child', el => el.textContent)
        } catch { nombre = null }
        await page.close()
        return { nombre, telefono, direccion }
    }))
    return items
}

function updateData(items, term) {
    let [clave, ciudad] = term.split(', ')
    let itemsWithTerm = items.map(item => ({...item, clave, ciudad }))
    let fileData = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));
    fileData = fileData.concat(itemsWithTerm)
    fs.writeFileSync('data/data.json', JSON.stringify(fileData), 'utf-8');
}

function resetData() {
    fs.writeFileSync('data/data.json', JSON.stringify([]), 'utf-8');
}

async function getPageLinks(page, selector) {
    let resultsContainer = await page.$(selector)
    for (let i = 0; i < 3; i++) {
        await page.evaluate(c => c.scroll(0, c.scrollHeight), resultsContainer)
        await page.waitForTimeout(500)
    }
    return page.$$eval('.a4gq8e-aVTXAb-haAclf-jRmmHf-hSRGPd', (cards) => cards.map(el => el.getAttribute('href')))

}

function writeXLSX(){
    let data = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));
    try{
        let ws = xlsx.utils.json_to_sheet([])
        ws = xlsx.utils.sheet_add_json(ws, data)
        const wb = xlsx.utils.book_new()
        xlsx.utils.book_append_sheet(wb, ws, 'scraping-data')
        let fileName = 'data/data.xlsx'
        xlsx.writeFile(wb, fileName)
    }catch(err){
        console.error(err)
    }
}