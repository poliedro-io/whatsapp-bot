const fs = require('fs');

function arrayToDict() {
    let dataArray = JSON.parse(fs.readFileSync('data/whatsapp-sender.json', 'utf-8'));
    let dataDict = Object.assign({}, ...dataArray.map((x) => ({ [x]: true })));
    fs.writeFileSync('data/logs.json', JSON.stringify(dataDict), 'utf-8');
}

// arrayToDict()


function updateData(number, error) {
    let data = JSON.parse(fs.readFileSync('data/temp.json', 'utf-8'));
    data[number] = {
        timestamp: Date.now(),
        error
    }
    fs.writeFileSync('data/temp.json', JSON.stringify(data), 'utf-8');
}

function hasSent(number) {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    return !!data[number]
}

// updateData('2349823434')

function countSended() {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    return [
        Object.entries(data).length,
        Object.entries(data).filter(([k, v]) => v == true || (v['timestamp'] && !v['error'])).length
    ]
}

console.log(countSended())


// arrayToDict()
