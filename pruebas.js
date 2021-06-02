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
    console.log(fileData.length, items.length)
}

cleanData()