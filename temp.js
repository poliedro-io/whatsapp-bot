const fs = require('fs');

function arrayToDict() {
    let dataArray = JSON.parse(fs.readFileSync('data/whatsapp-sender.json', 'utf-8'));
    let dataDict = Object.assign({}, ...dataArray.map((x) => ({[x]: true})));
    fs.writeFileSync('data/logs.json', JSON.stringify(dataDict), 'utf-8');
}

// arrayToDict()


function updateData(number, reason) {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    data[number] = reason || true
    fs.writeFileSync('data/logs.json', JSON.stringify(data), 'utf-8');
}

function hasSent(number) {
    let data = JSON.parse(fs.readFileSync('data/logs.json', 'utf-8'));
    return !!data[number]
}

// arrayToDict()
