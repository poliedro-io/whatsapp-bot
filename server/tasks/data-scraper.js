const puppeteer = require('puppeteer')
const xlsx = require('xlsx')
const fs = require('fs');
const { flatten } = require('lodash');
const url = 'https://www.google.cl/maps/'
const countries = JSON.parse(fs.readFileSync('src/assets/countries.json', 'utf-8'));

let count = 0

async function run({ keyWords, cities }, task) {

    if (!keyWords.length || !cities.length)
        return ''

    let searchTerms = flatten(keyWords.map(kw =>
        cities.map(c => `${kw}, ${c}`)
    ))

    resetData()

    const browser = await puppeteer.launch({ "headless": false });
    task.setStatus(task.states.RUNNING)
    task.log('Comenzando obtención de datos...')

    for (let [i, term] of searchTerms.entries()) {
        await runByTerm(browser, term, task)
        task.setProgress((i + 1) / searchTerms.length)
    }

    task.log('Proceso completado.')

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

async function runByTerm(browser, term, task) {
    try {
        const page = await browser.newPage()
        await page.goto(url)
        await page.waitForSelector('.tactile-searchbox-input');
        await page.type('.tactile-searchbox-input', term)
        await page.click('#searchbox-searchbutton');
        let resultsSelector = `div[aria-label="Resultados de ${term}"]`
        await page.waitForSelector(resultsSelector);

        let isNextable = true
        let disabledAttr

        do {
            // ver si hay mas resultados disponibles
            disabledAttr = await page.$eval('button[aria-label="Página siguiente"]', el => el.getAttribute('disabled'))
            isNextable = disabledAttr ? false : true

            // obtener 20 items (1 pagina)
            let links = await getPageLinks(page, resultsSelector);
            let pageItems = await scrapSinglePage(links, browser)
            console.log(pageItems);
            // actualizar archivo json
            let added = updateData(pageItems, term)
            count += added
            task.log(`${count} registros obtenidos`)

            // avanzar página
            try {
                await page.click('button[aria-label="Página siguiente"]');
            } catch (err) {
                console.log('No hay más resultados.')
                break
            }
            await sleep(1500)
        } while (isNextable)

        await page.close()

    } catch (error) {
        console.log('Error: algún elemento no se encontró')
    }

    await closeAllPages(browser)

}

async function scrapSinglePage(links, browser) {
    const items = await Promise.all(links.map(async (link) => {
        const page = await browser.newPage();
        try {

            await page.goto(link, {
                waitUntil: 'domcontentloaded'
            })
            await page.waitForSelector('.Io6YTe', {timeout: 20000})
        } catch{
            return null
        }
            let telefono, direccion, nombre, website
        try {
            nombre = await page.$eval('.DUwDvf span:first-child', el => el.textContent)
        } catch { nombre = null }
        try {
            telefono = await page.$eval('button[aria-label*="Teléfono"] .Io6YTe', el => el.textContent)
        } catch { telefono = null }
        try {
            direccion = await page.$eval('button[aria-label*="Dirección"] .Io6YTe', el => el.textContent)
        } catch { direccion = null }
        try {
            website = await page.$eval('a[aria-label*="Sitio web"] .Io6YTe', el => el.textContent)
        } catch { website = null }
        await page.close()
        return { nombre, telefono, direccion, website }
    }))
    return items.filter(el => el !== null)
}

function updateData(items, term) {
    let [clave, ciudad] = term.split(', ')
    let itemsWithTerm = items.map(item => ({ ...item, clave, ciudad })).filter(item => {
        if (item.direccion) {
            let country = item.direccion.split(', ').pop()
            return !countries[country]
        }
        else return true
    })
    let fileData
    fileData = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));
    fileData = fileData.concat(itemsWithTerm)
    fs.writeFileSync('data/data.json', JSON.stringify(fileData), 'utf-8');

    return itemsWithTerm.length
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
    return page.$$eval('.hfpxzc', (cards) => cards.map(el => el.getAttribute('href')))

}

async function closeAllPages(browser) {
    for (const page of await browser.pages()) {
        if (!await page.isClosed())
            await page.close()
    }
}

function writeXLSX() {
    let data = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));
    try {
        let ws = xlsx.utils.json_to_sheet([])
        ws = xlsx.utils.sheet_add_json(ws, data)
        const wb = xlsx.utils.book_new()
        xlsx.utils.book_append_sheet(wb, ws, 'scraping-data')
        let fileName = 'data/data.xlsx'
        xlsx.writeFile(wb, fileName)
    } catch (err) {
        console.error(err)
    }
}