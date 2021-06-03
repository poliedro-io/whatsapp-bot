const fs = require('fs');
const countries = JSON.parse(fs.readFileSync('src/assets/countries.json', 'utf-8'));
const xlsx = require('xlsx')

function cleanData(file) {
    let data = readXLSX(`data/${file}.xlsx`)
    let cleanedData = data.filter(item => {
        if(item.direccion){
            let country = item.direccion.split(', ').pop()    
            return !countries[country]
        }
        else return true
    })
    return cleanedData
}

function writeXLSX(data) {
    try {
        let ws = xlsx.utils.json_to_sheet([])
        ws = xlsx.utils.sheet_add_json(ws, data)
        const wb = xlsx.utils.book_new()
        xlsx.utils.book_append_sheet(wb, ws, 'scraping-data')
        let fileName = 'data/cleaned-data.xlsx'
        xlsx.writeFile(wb, fileName)
    } catch (err) {
        console.error(err)
    }
}

function readXLSX(file){
    let wb = xlsx.readFile(file, { type: 'array' });
    ws = wb.Sheets[wb.SheetNames[0]]
    let data = xlsx.utils.sheet_to_json(ws)
    return data
}

// let data = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));
// writeXLSX(data)


function merge(){
    let doc1 = readXLSX('data/merged/groomer-01.xlsx')
    let doc2 = readXLSX('data/merged/groomer-02.xlsx')
    let doc3 = readXLSX('data/merged/groomer-03.xlsx')
    let doc4 = readXLSX('data/merged/groomer-04.xlsx')
    let merged = doc1.concat(doc2, doc3, doc4)
    console.log(merged.length)
    data = cleanData(merged)
    writeXLSX(data)
}

data = cleanData('veterinaria')
writeXLSX(data)