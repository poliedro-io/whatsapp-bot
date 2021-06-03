const fs = require('fs');
const countries = JSON.parse(fs.readFileSync('src/assets/countries.json', 'utf-8'));
let fileData = JSON.parse(fs.readFileSync('data/data.json', 'utf-8'));

function cleanData() {
    let items = fileData.filter(item => {
        if(item.direccion){
            let country = item.direccion.split(', ').pop()    
            return !countries[country]
        }
        else return true
    })
    
    fs.writeFileSync('data/data.json', JSON.stringify(items), 'utf-8');
}

function writeXLSX(data) {
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

writeXLSX(fileData)
