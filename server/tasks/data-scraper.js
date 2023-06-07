const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
const fs = require("fs");
const { flatten, chunk } = require("lodash");
const url = "https://www.google.cl/maps/";
const countries = JSON.parse(
  fs.readFileSync("src/assets/countries.json", "utf-8")
);

let count = 0;
let task;
let browser;
const RESULTS_SELECTOR = `div[role="feed"]`;

async function run({ keyWords, cities }, _task) {
  task = _task;
  count = 0;
  resetData();
  if (!keyWords.length || !cities.length) return "";

  let searchTerms = flatten(
    keyWords.map((kw) => cities.map((c) => `${kw}, ${c}`))
  );

  browser = await puppeteer.launch({
    headless: true,
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

  task.setStatus(task.states.RUNNING);
  task.log("Comenzando obtención de datos...");

  for (let [i, term] of searchTerms.entries()) {
    await runByTerm(term, task);
    task.setProgress((i + 1) / searchTerms.length);
  }

  task.log("Proceso completado.");

  await browser.close();

  writeXLSX();

  return "Completado!";
}

module.exports = {
  run,
};

async function runByTerm(term) {
  try {
    console.log("Buscando: ", term);
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector("#searchboxinput");
    await page.type("#searchboxinput", term);
    await page.click("#searchbox-searchbutton");
    await page.waitForSelector(RESULTS_SELECTOR);
    let links = await getPageLinks(page);
    await scrapeSinglePages(links, term);
    await page.close();
  } catch (error) {
    console.log(error);
  }

  await closeAllPages();
}

function updateData(items, term) {
  let [clave, ciudad] = term.split(", ");
  let itemsWithTerm = items
    .map((item) => ({ ...item, clave, ciudad }))
    .filter((item) => {
      if (item.direccion) {
        let country = item.direccion.split(", ").pop();
        return !countries[country];
      } else return true;
    });
  let fileData;
  fileData = JSON.parse(fs.readFileSync("data/scraped-data.json", "utf-8"));
  fileData = fileData.concat(itemsWithTerm);
  fs.writeFileSync("data/scraped-data.json", JSON.stringify(fileData), "utf-8");

  return itemsWithTerm.length;
}

function resetData() {
  fs.writeFileSync("data/scraped-data.json", JSON.stringify([]), "utf-8");
}

async function getPageLinks(page) {
  let resultsContainer = await page.$(RESULTS_SELECTOR);
  let links = [];
  let thereAreMoreItems = true;
  while (true) {
    await page.evaluate((c) => c.scroll(0, c.scrollHeight), resultsContainer);
    await page
      .waitForFunction(
        (links) => document.querySelectorAll(".hfpxzc").length > links.length,
        {
          timeout: 5000,
        },
        links
      )
      .catch(() => (thereAreMoreItems = false));
    if (!thereAreMoreItems) break;

    links = await page.$$eval(".hfpxzc", (cards) =>
      cards.map((el) => el.getAttribute("href"))
    );
    await page.waitForTimeout(500);
  }

  return links;
}

async function scrapeSinglePages(links, term) {
  const batches = chunk(links, 10);
  for (let batch of batches) {
    let items = await Promise.all(
      batch.map(async (link) => {
        const page = await browser.newPage();
        try {
          await page.goto(link, {
            waitUntil: "domcontentloaded",
          });
          await page.waitForSelector(".Io6YTe", { timeout: 20000 });
        } catch {
          return null;
        }
        let telefono, direccion, nombre, website;
        try {
          nombre = await page.$eval(
            "h1.fontHeadlineLarge",
            (el) => el.textContent
          );
        } catch {
          nombre = null;
        }
        try {
          telefono = await page.$eval(
            'button[aria-label*="Teléfono"] .Io6YTe',
            (el) => el.textContent
          );
        } catch {
          telefono = null;
        }
        try {
          direccion = await page.$eval(
            'button[aria-label*="Dirección"] .Io6YTe',
            (el) => el.textContent
          );
        } catch {
          direccion = null;
        }
        try {
          website = await page.$eval(
            'a[aria-label*="Sitio web"] .Io6YTe',
            (el) => el.textContent
          );
        } catch {
          website = null;
        }
        await page.close();
        return { nombre, telefono, direccion, website };
      })
    );
    console.log(items.length, "items added");
    let added = updateData(items, term);
    count += added;
    task.log(`${count} registros obtenidos.`);
  }
}

async function closeAllPages() {
  for (const page of await browser.pages()) {
    if (!(await page.isClosed())) await page.close();
  }
}

function writeXLSX() {
  let data = JSON.parse(fs.readFileSync("data/scraped-data.json", "utf-8"));
  try {
    let ws = xlsx.utils.json_to_sheet([]);
    ws = xlsx.utils.sheet_add_json(ws, data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "scraped-data");
    let fileName = "data/scraped-data.xlsx";
    xlsx.writeFile(wb, fileName);
  } catch (err) {
    console.error(err);
  }
}
